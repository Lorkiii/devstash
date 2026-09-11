import type { Argon2idParameters } from "./constants";
import type {
  VaultEncryptionProfile,
  VaultLifecycleDraft,
  VaultRecoveryRotationDraft,
  VaultSetupDraft,
} from "../vault-profile.types";

interface WorkerRequestBase {
  id: string;
}

export interface Argon2idBenchmarkRequest extends WorkerRequestBase {
  kind: "benchmark-argon2id";
  passphraseBytes: ArrayBuffer;
  salt: ArrayBuffer;
  parameters: Argon2idParameters;
}

export interface SetupVaultRequest extends WorkerRequestBase {
  kind: "setup-vault";
  ownerId: string;
  profileId: string;
  passphraseBytes: ArrayBuffer;
}

export interface UnlockVaultRequest extends WorkerRequestBase {
  kind: "unlock-vault";
  ownerId: string;
  profile: VaultEncryptionProfile;
  passphraseBytes: ArrayBuffer;
}

export interface ChangePassphraseRequest extends WorkerRequestBase {
  kind: "change-passphrase";
  ownerId: string;
  profile: VaultEncryptionProfile;
  currentPassphraseBytes: ArrayBuffer;
  newPassphraseBytes: ArrayBuffer;
}

export interface RecoverVaultRequest extends WorkerRequestBase {
  kind: "recover-vault";
  ownerId: string;
  profile: VaultEncryptionProfile;
  recoveryPhrase: string;
  newPassphraseBytes: ArrayBuffer;
}

export interface RotateRecoveryRequest extends WorkerRequestBase {
  kind: "rotate-recovery";
  ownerId: string;
  profile: VaultEncryptionProfile;
  currentPassphraseBytes: ArrayBuffer;
}

export type VaultCryptoWorkerRequest =
  | Argon2idBenchmarkRequest
  | SetupVaultRequest
  | UnlockVaultRequest
  | ChangePassphraseRequest
  | RecoverVaultRequest
  | RotateRecoveryRequest;

export interface Argon2idBenchmarkSuccess {
  id: string;
  ok: true;
  kind: "benchmark-argon2id";
  durationMs: number;
}

export interface SetupVaultSuccess {
  id: string;
  ok: true;
  kind: "setup-vault";
  result: VaultSetupDraft;
}

export interface UnlockVaultSuccess {
  id: string;
  ok: true;
  kind: "unlock-vault" | "change-passphrase" | "recover-vault";
  result: VaultLifecycleDraft;
}

export interface RotateRecoverySuccess {
  id: string;
  ok: true;
  kind: "rotate-recovery";
  result: VaultRecoveryRotationDraft;
}

export interface VaultCryptoWorkerFailure {
  id: string;
  ok: false;
  code: "INVALID_REQUEST" | "AUTHENTICATION_FAILED" | "CRYPTO_UNAVAILABLE";
}

export type VaultCryptoWorkerResponse =
  | Argon2idBenchmarkSuccess
  | SetupVaultSuccess
  | UnlockVaultSuccess
  | RotateRecoverySuccess
  | VaultCryptoWorkerFailure;
