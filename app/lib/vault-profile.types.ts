export interface VaultArgon2idProfile {
  algorithm: "argon2id";
  algorithmVersion: 19;
  salt: string;
  memoryKiB: number;
  iterations: number;
  parallelism: 1;
  outputBytes: 32;
}

export interface VaultPassphraseKeyWrap {
  algorithm: "AES-256-GCM";
  nonce: string;
  tagBits: 128;
  wrappedDek: string;
}

export interface VaultRecoveryKdf {
  algorithm: "HKDF-SHA-256";
  salt: string;
  info: "devstash:recovery-wrap:v1";
  outputBytes: 32;
}

export interface VaultRecoveryProfile {
  phraseEncoding: "bip39-english-256-v1";
  kdf: VaultRecoveryKdf;
  keyWrap: VaultPassphraseKeyWrap;
}

export interface VaultEncryptionProfile {
  profileId: string;
  profileFormatVersion: 1;
  profileRevision: number;
  passphraseWrapRevision: number;
  recoveryWrapRevision: number;
  passphraseEncoding: "utf8-nfc-v1";
  kdf: VaultArgon2idProfile;
  passphraseKeyWrap: VaultPassphraseKeyWrap;
  recovery: VaultRecoveryProfile;
}

export interface VaultLifecycleDraft {
  profile: VaultEncryptionProfile;
  /** Non-extractable active-tab key handle; never serialized or persisted. */
  dek: CryptoKey;
}

export interface ReplacePassphraseProfileRequest {
  action: "replace-passphrase";
  expectedProfileRevision: number;
  expectedPassphraseWrapRevision: number;
  kdf: VaultEncryptionProfile["kdf"];
  passphraseKeyWrap: VaultPassphraseKeyWrap;
}

export interface ReplaceRecoveryProfileRequest {
  action: "replace-recovery";
  expectedProfileRevision: number;
  expectedRecoveryWrapRevision: number;
  recovery: VaultRecoveryProfile;
}

export type VaultProfileUpdateRequest =
  | ReplacePassphraseProfileRequest
  | ReplaceRecoveryProfileRequest;

export interface VaultSetupDraft extends VaultLifecycleDraft {
  recoveryPhrase: string;
}

export interface VaultRecoveryRotationDraft extends VaultLifecycleDraft {
  recoveryPhrase: string;
}
