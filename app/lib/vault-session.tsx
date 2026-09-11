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
import { fetchVaultProfile } from "./vault-profile-client";
import type { RecentKind, RecentRef, VaultData } from "./vault-data.types";
import type { VaultEncryptionProfile, VaultLifecycleDraft } from "./vault-profile.types";
import type { AutoLockMinutes, VaultLockState, VaultSessionValue } from "./vault-session.types";

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "wheel", "touchstart"];
const BROADCAST_CHANNEL = "devstash-vault-lifecycle-v1";
const MAX_RECENTS = 8;
const EMPTY_VAULT_DATA: VaultData = {
  secrets: [],
  envBundles: [],
  projects: [],
  notes: [],
  tasks: [],
};

const VaultSessionContext = createContext<VaultSessionValue | null>(null);

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

  const clearUnlockedState = useCallback(() => {
    dekRef.current = null;
    setData(null);
    setUnlockedAt(null);
    setSecondsUntilAutoLock(null);
    setRecents([]);
    setLockState(profileRef.current ? "locked" : "no-profile");
  }, []);

  const lock = useCallback(() => {
    clearUnlockedState();
    channelRef.current?.postMessage({ type: "lock" });
  }, [clearUnlockedState]);

  const prepareForSignOut = useCallback(() => {
    clearUnlockedState();
    channelRef.current?.postMessage({ type: "signed-out" });
  }, [clearUnlockedState]);

  const reloadProfile = useCallback(async () => {
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
  }, []);

  const openVault = useCallback((draft: VaultLifecycleDraft) => {
    assertActiveDek(draft.dek);
    dekRef.current = draft.dek;
    profileRef.current = draft.profile;
    setProfile(draft.profile);
    setData(EMPTY_VAULT_DATA);
    const now = Date.now();
    lastActivityRef.current = now;
    setUnlockedAt(now);
    setSecondsUntilAutoLock(autoLockMinutes * 60);
    setLockState("unlocked");
  }, [autoLockMinutes]);

  const openVaultAfterProfileChange = useCallback((draft: VaultLifecycleDraft) => {
    openVault(draft);
    channelRef.current?.postMessage({ type: "profile-changed" });
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
