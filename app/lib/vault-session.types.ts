import type { RecentKind, RecentRef, VaultData } from "./vault-data.types";
import type { VaultEncryptionProfile, VaultLifecycleDraft } from "./vault-profile.types";

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
  openVault: (draft: VaultLifecycleDraft) => void;
  openVaultAfterProfileChange: (draft: VaultLifecycleDraft) => void;
  replaceUnlockedProfile: (draft: VaultLifecycleDraft) => void;
  setAutoLockMinutes: (minutes: AutoLockMinutes) => void;
  touchRecent: (kind: RecentKind, id: string) => void;
}
