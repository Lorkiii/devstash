import type { VaultItemCiphertext } from "./vault-item.types";
import type { VaultEncryptionProfile } from "./vault-profile.types";
import type {
  EnvBundleCiphertext,
  NoteCiphertext,
  ProjectCiphertext,
  TaskCategoryCiphertext,
  TaskCiphertext,
} from "./workspace.types";

export const VAULT_BACKUP_FORMAT = "devstash-encrypted-backup" as const;
export const VAULT_BACKUP_FORMAT_VERSION = 1 as const;
export const VAULT_BACKUP_MANIFEST_VERSION = 1 as const;
export const MAXIMUM_VAULT_BACKUP_BYTES = 32 * 1024 * 1024;

export interface VaultCiphertextRecords {
  vaultItems: VaultItemCiphertext[];
  projects: ProjectCiphertext[];
  envBundles: EnvBundleCiphertext[];
  notes: NoteCiphertext[];
  taskCategories: TaskCategoryCiphertext[];
  tasks: TaskCiphertext[];
}

export interface VaultBackupSnapshot {
  profile: VaultEncryptionProfile;
  records: VaultCiphertextRecords;
}

export interface VaultBackupManifestEnvelope {
  manifestVersion: 1;
  algorithm: "AES-256-GCM";
  nonce: string;
  tagBits: 128;
  ciphertext: string;
}

export interface EncryptedVaultBackup extends VaultBackupSnapshot {
  format: typeof VAULT_BACKUP_FORMAT;
  formatVersion: typeof VAULT_BACKUP_FORMAT_VERSION;
  exportedAt: string;
  manifest: VaultBackupManifestEnvelope;
}

export interface VaultBackupRecordCounts {
  vaultItems: number;
  projects: number;
  envBundles: number;
  notes: number;
  taskCategories: number;
  tasks: number;
}

export interface VaultBackupRestoreResult {
  profile: VaultEncryptionProfile;
  counts: VaultBackupRecordCounts;
}

export interface VaultBackupRestoreExpectation {
  profileId: string;
  profileRevision: number;
}
