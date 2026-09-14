"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createVaultItem,
  removeVaultItem,
  replaceVaultItem,
} from "./vault-item-client";
import { decryptGenericSecret, encryptGenericSecret } from "./vault-crypto/generic-secret";
import { decryptEnvBundle, encryptEnvBundle } from "./vault-crypto/env-bundle";
import { decryptNote, encryptNote } from "./vault-crypto/note";
import { decryptProject, encryptProject } from "./vault-crypto/project";
import { decryptTask, encryptTask } from "./vault-crypto/task";
import { decryptTaskCategory, encryptTaskCategory } from "./vault-crypto/task-category";
import { fetchVaultProfile } from "./vault-profile-client";
import { createEncryptedVaultBackup } from "./vault-crypto/backup";
import { fetchVaultBackupSnapshot } from "./vault-backup-client";
import { decryptVaultSnapshot } from "./vault-snapshot";
import { clearSensitiveClipboardIfUnchanged } from "./sensitive-clipboard";
import type {
  EnvBundle,
  Note,
  Project,
  RecentKind,
  RecentRef,
  Task,
  TaskCategory,
  VaultData,
} from "./vault-data.types";
import type { GenericSecretInput } from "./vault-item.types";
import type { VaultEncryptionProfile, VaultLifecycleDraft } from "./vault-profile.types";
import type { AutoLockMinutes, VaultLockState, VaultSessionValue } from "./vault-session.types";
import {
  createEnvBundleRecord,
  createNoteRecord,
  createProjectRecord,
  createTaskRecord,
  createTaskCategoryRecord,
  removeEnvBundleRecord,
  removeNoteRecord,
  removeProjectRecord,
  removeTaskRecord,
  removeTaskCategoryRecord,
  replaceEnvBundleRecord,
  replaceNoteRecord,
  replaceProjectRecord,
  replaceTaskRecord,
  replaceTaskCategoryRecord,
} from "./workspace-client";
import type {
  EnvBundleInput,
  NoteInput,
  ProjectInput,
  TaskCategoryInput,
  TaskInput,
} from "./workspace.types";

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "wheel", "touchstart"];
const BROADCAST_CHANNEL = "devstash-vault-lifecycle-v1";
const MAX_RECENTS = 8;

const VaultSessionContext = createContext<VaultSessionValue | null>(null);

export class VaultOpenError extends Error {
  override readonly name = "VaultOpenError";
}

function assertActiveDek(dek: CryptoKey): void {
  if (
    !(dek instanceof CryptoKey) ||
    dek.extractable ||
    dek.algorithm.name !== "AES-GCM" ||
    !dek.usages.includes("encrypt") ||
    !dek.usages.includes("decrypt")
  ) {
    throw new Error("The vault key handle is invalid.");
  }
}

export function VaultSessionProvider({
  children,
  ownerId,
}: {
  children: React.ReactNode;
  ownerId: string;
}) {
  const [lockState, setLockState] = useState<VaultLockState>("loading");
  const [profile, setProfile] = useState<VaultEncryptionProfile | null>(null);
  const [data, setData] = useState<VaultData | null>(null);
  const [unlockedAt, setUnlockedAt] = useState<number | null>(null);
  const [autoLockMinutes, setAutoLockMinutes] = useState<AutoLockMinutes>(15);
  const [secondsUntilAutoLock, setSecondsUntilAutoLock] = useState<number | null>(null);
  const [recents, setRecents] = useState<RecentRef[]>([]);
  const profileRef = useRef<VaultEncryptionProfile | null>(null);
  const dekRef = useRef<CryptoKey | null>(null);
  const lastActivityRef = useRef<number>(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const requestControllersRef = useRef(new Set<AbortController>());
  const operationRevisionRef = useRef(0);

  const abortRequests = useCallback(() => {
    for (const controller of requestControllersRef.current) controller.abort();
    requestControllersRef.current.clear();
  }, []);

  const clearUnlockedState = useCallback(() => {
    operationRevisionRef.current += 1;
    abortRequests();
    dekRef.current = null;
    setData(null);
    setUnlockedAt(null);
    setSecondsUntilAutoLock(null);
    setRecents([]);
    setLockState(profileRef.current ? "locked" : "no-profile");
    void clearSensitiveClipboardIfUnchanged();
  }, [abortRequests]);

  const lock = useCallback(() => {
    clearUnlockedState();
    channelRef.current?.postMessage({ type: "lock" });
  }, [clearUnlockedState]);

  const prepareForSignOut = useCallback(() => {
    clearUnlockedState();
    channelRef.current?.postMessage({ type: "signed-out" });
  }, [clearUnlockedState]);

  const reloadProfile = useCallback(async () => {
    operationRevisionRef.current += 1;
    abortRequests();
    dekRef.current = null;
    setData(null);
    setLockState("loading");
    try {
      const nextProfile = await fetchVaultProfile();
      profileRef.current = nextProfile;
      setProfile(nextProfile);
      setLockState(nextProfile ? "locked" : "no-profile");
    } catch {
      profileRef.current = null;
      setProfile(null);
      setLockState("load-error");
    }
  }, [abortRequests]);

  const openVault = useCallback(async (draft: VaultLifecycleDraft) => {
    assertActiveDek(draft.dek);
    abortRequests();
    const controller = new AbortController();
    const revision = operationRevisionRef.current + 1;
    operationRevisionRef.current = revision;
    requestControllersRef.current.add(controller);
    try {
      const snapshot = await fetchVaultBackupSnapshot(controller.signal);
      if (JSON.stringify(snapshot.profile) !== JSON.stringify(draft.profile)) {
        throw new VaultOpenError("Vault profile changed during unlock.");
      }
      const decrypted = await decryptVaultSnapshot(ownerId, draft.dek, snapshot.records);
      if (revision !== operationRevisionRef.current || controller.signal.aborted) {
        throw new DOMException("Operation cancelled.", "AbortError");
      }
      dekRef.current = draft.dek;
      profileRef.current = draft.profile;
      setProfile(draft.profile);
      setData(decrypted);
      const now = Date.now();
      lastActivityRef.current = now;
      setUnlockedAt(now);
      setSecondsUntilAutoLock(autoLockMinutes * 60);
      setLockState("unlocked");
    } catch (error) {
      controller.abort();
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      throw new VaultOpenError("Encrypted vault data could not be opened.");
    } finally {
      requestControllersRef.current.delete(controller);
    }
  }, [abortRequests, autoLockMinutes, ownerId]);

  const openVaultAfterProfileChange = useCallback(async (draft: VaultLifecycleDraft) => {
    channelRef.current?.postMessage({ type: "profile-changed" });
    await openVault(draft);
  }, [openVault]);

  const replaceUnlockedProfile = useCallback((draft: VaultLifecycleDraft) => {
    if (lockState !== "unlocked") throw new Error("The vault must be unlocked.");
    assertActiveDek(draft.dek);
    dekRef.current = draft.dek;
    profileRef.current = draft.profile;
    setProfile(draft.profile);
    lastActivityRef.current = Date.now();
    channelRef.current?.postMessage({ type: "profile-changed" });
  }, [lockState]);

  const touchRecent = useCallback((kind: RecentKind, id: string) => {
    setRecents((current) => {
      const withoutSame = current.filter((entry) => !(entry.kind === kind && entry.id === id));
      return [{ kind, id, openedAt: Date.now() }, ...withoutSame].slice(0, MAX_RECENTS);
    });
  }, []);

  const runUnlockedOperation = useCallback(async <T,>(
    operation: (dek: CryptoKey, signal: AbortSignal) => Promise<T>,
  ): Promise<T> => {
    const dek = dekRef.current;
    if (lockState !== "unlocked" || !dek) {
      throw new Error("The vault must be unlocked.");
    }
    const controller = new AbortController();
    const revision = operationRevisionRef.current;
    requestControllersRef.current.add(controller);
    try {
      const result = await operation(dek, controller.signal);
      if (revision !== operationRevisionRef.current || controller.signal.aborted) {
        throw new DOMException("Operation cancelled.", "AbortError");
      }
      return result;
    } finally {
      requestControllersRef.current.delete(controller);
    }
  }, [lockState]);

  const exportEncryptedBackup = useCallback(async () => runUnlockedOperation(
    async (dek, signal) => {
      const snapshot = await fetchVaultBackupSnapshot(signal);
      if (!profileRef.current || JSON.stringify(snapshot.profile) !== JSON.stringify(profileRef.current)) {
        throw new Error("Vault profile changed during export.");
      }
      await decryptVaultSnapshot(ownerId, dek, snapshot.records);
      return createEncryptedVaultBackup(ownerId, dek, snapshot);
    },
  ), [ownerId, runUnlockedOperation]);

  const createGenericSecret = useCallback(async (input: GenericSecretInput) => {
    const created = await runUnlockedOperation(async (dek, signal) => {
      const encrypted = await encryptGenericSecret(ownerId, dek, input);
      return decryptGenericSecret(ownerId, dek, await createVaultItem(encrypted, signal));
    });
    setData((current) => current ? { ...current, secrets: [created, ...current.secrets] } : null);
    return created;
  }, [ownerId, runUnlockedOperation]);

  const updateGenericSecret = useCallback(async (id: string, input: GenericSecretInput) => {
    const updated = await runUnlockedOperation(async (dek, signal) => {
      const encrypted = await encryptGenericSecret(ownerId, dek, input, id);
      const stored = await replaceVaultItem(id, {
        projectId: encrypted.projectId,
        itemType: encrypted.itemType,
        envelope: encrypted.envelope,
      }, signal);
      return decryptGenericSecret(ownerId, dek, stored);
    });
    setData((current) => current ? {
      ...current,
      secrets: current.secrets.map((item) => item.id === id ? updated : item),
    } : null);
    return updated;
  }, [ownerId, runUnlockedOperation]);

  const deleteVaultItem = useCallback(async (id: string) => {
    await runUnlockedOperation((_, signal) => removeVaultItem(id, signal));
    setData((current) => current ? {
      ...current,
      secrets: current.secrets.filter((item) => item.id !== id),
    } : null);
    setRecents((current) => current.filter((entry) => entry.id !== id));
  }, [runUnlockedOperation]);

  const createProject = useCallback(async (input: ProjectInput): Promise<Project> => {
    const created = await runUnlockedOperation(async (dek, signal) => {
      const encrypted = await encryptProject(ownerId, dek, input);
      return decryptProject(ownerId, dek, await createProjectRecord(encrypted, signal));
    });
    setData((current) => current ? { ...current, projects: [created, ...current.projects] } : null);
    return created;
  }, [ownerId, runUnlockedOperation]);

  const updateProject = useCallback(async (id: string, input: ProjectInput): Promise<Project> => {
    const updated = await runUnlockedOperation(async (dek, signal) => {
      const encrypted = await encryptProject(ownerId, dek, input, id);
      const stored = await replaceProjectRecord(id, { envelope: encrypted.envelope }, signal);
      return decryptProject(ownerId, dek, stored);
    });
    setData((current) => current ? {
      ...current,
      projects: current.projects.map((project) => project.id === id ? updated : project),
    } : null);
    return updated;
  }, [ownerId, runUnlockedOperation]);

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    await runUnlockedOperation((_, signal) => removeProjectRecord(id, signal));
    setData((current) => current ? {
      ...current,
      projects: current.projects.filter((project) => project.id !== id),
    } : null);
    setRecents((current) => current.filter((entry) => !(entry.kind === "project" && entry.id === id)));
  }, [runUnlockedOperation]);

  const createEnvBundle = useCallback(async (input: EnvBundleInput): Promise<EnvBundle> => {
    const created = await runUnlockedOperation(async (dek, signal) => {
      const encrypted = await encryptEnvBundle(ownerId, dek, input);
      return decryptEnvBundle(ownerId, dek, await createEnvBundleRecord(encrypted, signal));
    });
    setData((current) => current ? { ...current, envBundles: [created, ...current.envBundles] } : null);
    return created;
  }, [ownerId, runUnlockedOperation]);

  const updateEnvBundle = useCallback(async (id: string, input: EnvBundleInput): Promise<EnvBundle> => {
    const updated = await runUnlockedOperation(async (dek, signal) => {
      const encrypted = await encryptEnvBundle(ownerId, dek, input, id);
      const stored = await replaceEnvBundleRecord(id, {
        projectId: encrypted.projectId,
        envelope: encrypted.envelope,
      }, signal);
      return decryptEnvBundle(ownerId, dek, stored);
    });
    setData((current) => current ? {
      ...current,
      envBundles: current.envBundles.map((bundle) => bundle.id === id ? updated : bundle),
    } : null);
    return updated;
  }, [ownerId, runUnlockedOperation]);

  const deleteEnvBundle = useCallback(async (id: string): Promise<void> => {
    await runUnlockedOperation((_, signal) => removeEnvBundleRecord(id, signal));
    setData((current) => current ? {
      ...current,
      envBundles: current.envBundles.filter((bundle) => bundle.id !== id),
    } : null);
  }, [runUnlockedOperation]);

  const createNote = useCallback(async (input: NoteInput): Promise<Note> => {
    const created = await runUnlockedOperation(async (dek, signal) => {
      const encrypted = await encryptNote(ownerId, dek, input);
      return decryptNote(ownerId, dek, await createNoteRecord(encrypted, signal));
    });
    setData((current) => current ? { ...current, notes: [created, ...current.notes] } : null);
    return created;
  }, [ownerId, runUnlockedOperation]);

  const updateNote = useCallback(async (id: string, input: NoteInput): Promise<Note> => {
    const updated = await runUnlockedOperation(async (dek, signal) => {
      const encrypted = await encryptNote(ownerId, dek, input, id);
      const stored = await replaceNoteRecord(id, {
        projectId: encrypted.projectId,
        envelope: encrypted.envelope,
      }, signal);
      return decryptNote(ownerId, dek, stored);
    });
    setData((current) => current ? {
      ...current,
      notes: current.notes.map((note) => note.id === id ? updated : note),
    } : null);
    return updated;
  }, [ownerId, runUnlockedOperation]);

  const deleteNote = useCallback(async (id: string): Promise<void> => {
    await runUnlockedOperation((_, signal) => removeNoteRecord(id, signal));
    setData((current) => current ? {
      ...current,
      notes: current.notes.filter((note) => note.id !== id),
    } : null);
    setRecents((current) => current.filter((entry) => !(entry.kind === "note" && entry.id === id)));
  }, [runUnlockedOperation]);

  const createTask = useCallback(async (input: TaskInput): Promise<Task> => {
    const created = await runUnlockedOperation(async (dek, signal) => {
      const encrypted = await encryptTask(ownerId, dek, input);
      return decryptTask(ownerId, dek, await createTaskRecord(encrypted, signal));
    });
    setData((current) => current ? { ...current, tasks: [created, ...current.tasks] } : null);
    return created;
  }, [ownerId, runUnlockedOperation]);

  const updateTask = useCallback(async (id: string, input: TaskInput): Promise<Task> => {
    const updated = await runUnlockedOperation(async (dek, signal) => {
      const encrypted = await encryptTask(ownerId, dek, input, id);
      const stored = await replaceTaskRecord(id, {
        projectId: encrypted.projectId,
        categoryId: encrypted.categoryId,
        done: encrypted.done,
        sortOrder: encrypted.sortOrder,
        envelope: encrypted.envelope,
      }, signal);
      return decryptTask(ownerId, dek, stored);
    });
    setData((current) => current ? {
      ...current,
      tasks: current.tasks.map((task) => task.id === id ? updated : task),
    } : null);
    return updated;
  }, [ownerId, runUnlockedOperation]);

  const deleteTask = useCallback(async (id: string): Promise<void> => {
    await runUnlockedOperation((_, signal) => removeTaskRecord(id, signal));
    setData((current) => current ? {
      ...current,
      tasks: current.tasks.filter((task) => task.id !== id),
    } : null);
    setRecents((current) => current.filter((entry) => !(entry.kind === "task" && entry.id === id)));
  }, [runUnlockedOperation]);

  const createTaskCategory = useCallback(
    async (input: TaskCategoryInput): Promise<TaskCategory> => {
      const created = await runUnlockedOperation(async (dek, signal) => {
        const encrypted = await encryptTaskCategory(ownerId, dek, input);
        return decryptTaskCategory(
          ownerId,
          dek,
          await createTaskCategoryRecord(encrypted, signal),
        );
      });
      setData((current) => current
        ? { ...current, taskCategories: [...current.taskCategories, created] }
        : null);
      return created;
    },
    [ownerId, runUnlockedOperation],
  );

  const updateTaskCategory = useCallback(
    async (id: string, input: TaskCategoryInput): Promise<TaskCategory> => {
      const updated = await runUnlockedOperation(async (dek, signal) => {
        const encrypted = await encryptTaskCategory(ownerId, dek, input, id);
        const stored = await replaceTaskCategoryRecord(
          id,
          { envelope: encrypted.envelope },
          signal,
        );
        return decryptTaskCategory(ownerId, dek, stored);
      });
      setData((current) => current
        ? {
            ...current,
            taskCategories: current.taskCategories.map((category) =>
              category.id === id ? updated : category
            ),
          }
        : null);
      return updated;
    },
    [ownerId, runUnlockedOperation],
  );

  const deleteTaskCategory = useCallback(async (id: string): Promise<void> => {
    await runUnlockedOperation((_, signal) => removeTaskCategoryRecord(id, signal));
    setData((current) => current
      ? {
          ...current,
          taskCategories: current.taskCategories.filter((category) => category.id !== id),
        }
      : null);
  }, [runUnlockedOperation]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchVaultProfile(controller.signal)
      .then((nextProfile) => {
        if (controller.signal.aborted) return;
        profileRef.current = nextProfile;
        setProfile(nextProfile);
        setLockState(nextProfile ? "locked" : "no-profile");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        profileRef.current = null;
        setProfile(null);
        setLockState("load-error");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel(BROADCAST_CHANNEL);
    channelRef.current = channel;
    channel.addEventListener("message", (event: MessageEvent<unknown>) => {
      if (typeof event.data !== "object" || event.data === null || !("type" in event.data)) {
        return;
      }
      if (event.data.type === "lock" || event.data.type === "signed-out") {
        clearUnlockedState();
      } else if (event.data.type === "profile-changed") {
        clearUnlockedState();
        void reloadProfile();
      }
    });
    return () => {
      channelRef.current = null;
      channel.close();
    };
  }, [clearUnlockedState, reloadProfile]);

  useEffect(() => {
    const clearOnPageExit = () => {
      dekRef.current = null;
      setData(null);
    };
    window.addEventListener("pagehide", clearOnPageExit);
    return () => window.removeEventListener("pagehide", clearOnPageExit);
  }, []);

  useEffect(() => {
    if (lockState !== "unlocked") return;

    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };
    const checkInactivity = () => {
      const idleMs = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, Math.ceil((autoLockMinutes * 60_000 - idleMs) / 1000));
      setSecondsUntilAutoLock(remaining);
      if (remaining === 0) lock();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkInactivity();
    };
    ACTIVITY_EVENTS.forEach((eventName) =>
      window.addEventListener(eventName, markActivity, { passive: true })
    );
    document.addEventListener("visibilitychange", handleVisibility);
    const tick = window.setInterval(checkInactivity, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => window.removeEventListener(eventName, markActivity));
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(tick);
    };
  }, [lockState, autoLockMinutes, lock]);

  const value = useMemo<VaultSessionValue>(
    () => ({
      ownerId,
      lockState,
      profile,
      data,
      unlockedAt,
      autoLockMinutes,
      secondsUntilAutoLock,
      recents,
      lock,
      prepareForSignOut,
      reloadProfile,
      openVault,
      openVaultAfterProfileChange,
      replaceUnlockedProfile,
      createGenericSecret,
      updateGenericSecret,
      deleteVaultItem,
      createProject,
      updateProject,
      deleteProject,
      createEnvBundle,
      updateEnvBundle,
      deleteEnvBundle,
      createNote,
      updateNote,
      deleteNote,
      createTask,
      updateTask,
      deleteTask,
      createTaskCategory,
      updateTaskCategory,
      deleteTaskCategory,
      exportEncryptedBackup,
      setAutoLockMinutes,
      touchRecent,
    }),
    [
      ownerId,
      lockState,
      profile,
      data,
      unlockedAt,
      autoLockMinutes,
      secondsUntilAutoLock,
      recents,
      lock,
      prepareForSignOut,
      reloadProfile,
      openVault,
      openVaultAfterProfileChange,
      replaceUnlockedProfile,
      createGenericSecret,
      updateGenericSecret,
      deleteVaultItem,
      createProject,
      updateProject,
      deleteProject,
      createEnvBundle,
      updateEnvBundle,
      deleteEnvBundle,
      createNote,
      updateNote,
      deleteNote,
      createTask,
      updateTask,
      deleteTask,
      createTaskCategory,
      updateTaskCategory,
      deleteTaskCategory,
      exportEncryptedBackup,
      touchRecent,
    ],
  );

  return <VaultSessionContext.Provider value={value}>{children}</VaultSessionContext.Provider>;
}

export function useVaultSession(): VaultSessionValue {
  const context = useContext(VaultSessionContext);
  if (!context) throw new Error("useVaultSession must be used inside VaultSessionProvider");
  return context;
}

export function useUnlockedVault(): VaultData {
  const { data } = useVaultSession();
  if (!data) throw new Error("useUnlockedVault called while the vault is locked");
  return data;
}
