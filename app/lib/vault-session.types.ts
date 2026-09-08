import type { RecentKind, RecentRef, VaultData } from "./vault-data.types";

export type VaultLockState = "locked" | "unlocked";

export const AUTO_LOCK_OPTIONS_MINUTES = [5, 10, 15, 30, 60] as const;
export type AutoLockMinutes = (typeof AUTO_LOCK_OPTIONS_MINUTES)[number];

export interface VaultSessionValue {
  lockState: VaultLockState;
  /** Decrypted content held in memory; null whenever the vault is locked. */
  data: VaultData | null;
  unlockedAt: number | null;
  autoLockMinutes: AutoLockMinutes;
  /** Seconds until inactivity lock; null while locked. */
  secondsUntilAutoLock: number | null;
  recents: RecentRef[];
  unlock: () => void;
  lock: () => void;
  setAutoLockMinutes: (minutes: AutoLockMinutes) => void;
  touchRecent: (kind: RecentKind, id: string) => void;
}
