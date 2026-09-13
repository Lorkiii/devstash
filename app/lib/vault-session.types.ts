import type {
  EnvBundle,
  Note,
  Project,
  RecentKind,
  RecentRef,
  Task,
  TaskCategory,
  VaultData,
  VaultItem,
} from "./vault-data.types";
import type { GenericSecretInput } from "./vault-item.types";
import type { VaultEncryptionProfile, VaultLifecycleDraft } from "./vault-profile.types";
import type {
  EnvBundleInput,
  NoteInput,
  ProjectInput,
  TaskCategoryInput,
  TaskInput,
} from "./workspace.types";

export type VaultLockState = "loading" | "load-error" | "no-profile" | "locked" | "unlocked";

export const AUTO_LOCK_OPTIONS_MINUTES = [5, 10, 15, 30, 60] as const;
export type AutoLockMinutes = (typeof AUTO_LOCK_OPTIONS_MINUTES)[number];

export interface VaultSessionValue {
  ownerId: string;
  lockState: VaultLockState;
  profile: VaultEncryptionProfile | null;
  /** Decrypted content held in memory; null whenever the vault is locked. */
  data: VaultData | null;
  unlockedAt: number | null;
  autoLockMinutes: AutoLockMinutes;
  /** Seconds until inactivity lock; null while locked. */
  secondsUntilAutoLock: number | null;
  recents: RecentRef[];
  lock: () => void;
  prepareForSignOut: () => void;
  reloadProfile: () => Promise<void>;
  openVault: (draft: VaultLifecycleDraft) => Promise<void>;
  openVaultAfterProfileChange: (draft: VaultLifecycleDraft) => Promise<void>;
  replaceUnlockedProfile: (draft: VaultLifecycleDraft) => void;
  createGenericSecret: (input: GenericSecretInput) => Promise<VaultItem>;
  updateGenericSecret: (id: string, input: GenericSecretInput) => Promise<VaultItem>;
  deleteVaultItem: (id: string) => Promise<void>;
  createProject: (input: ProjectInput) => Promise<Project>;
  updateProject: (id: string, input: ProjectInput) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  createEnvBundle: (input: EnvBundleInput) => Promise<EnvBundle>;
  updateEnvBundle: (id: string, input: EnvBundleInput) => Promise<EnvBundle>;
  deleteEnvBundle: (id: string) => Promise<void>;
  createNote: (input: NoteInput) => Promise<Note>;
  updateNote: (id: string, input: NoteInput) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  createTask: (input: TaskInput) => Promise<Task>;
  updateTask: (id: string, input: TaskInput) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  createTaskCategory: (input: TaskCategoryInput) => Promise<TaskCategory>;
  updateTaskCategory: (id: string, input: TaskCategoryInput) => Promise<TaskCategory>;
  deleteTaskCategory: (id: string) => Promise<void>;
  setAutoLockMinutes: (minutes: AutoLockMinutes) => void;
  touchRecent: (kind: RecentKind, id: string) => void;
}
