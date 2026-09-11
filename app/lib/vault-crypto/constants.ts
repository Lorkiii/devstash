export const VAULT_PROFILE_FORMAT_VERSION = 1 as const;
export const RECORD_ENVELOPE_VERSION = 1 as const;
export const AES_GCM_TAG_BITS = 128 as const;

export const ARGON2ID_SALT_BYTES = 16 as const;
export const ARGON2ID_OUTPUT_BYTES = 32 as const;
export const RECOVERY_ENTROPY_BYTES = 32 as const;
export const RECOVERY_SALT_BYTES = 32 as const;
export const AES_GCM_KEY_BYTES = 32 as const;
export const AES_GCM_NONCE_BYTES = 12 as const;
export const AES_GCM_TAG_BYTES = 16 as const;

export const PASSPHRASE_ENCODING = "utf8-nfc-v1" as const;
export const RECOVERY_PHRASE_ENCODING = "bip39-english-256-v1" as const;
export const RECOVERY_HKDF_INFO = "devstash:recovery-wrap:v1" as const;

export const PASSPHRASE_MIN_CODE_POINTS = 15 as const;
export const PASSPHRASE_MAX_CODE_POINTS = 128 as const;

export const ENCRYPTED_ENTITY_TYPES = [
  "vault-item",
  "project",
  "note",
  "task",
  "env-bundle",
] as const;

export type EncryptedEntityType = (typeof ENCRYPTED_ENTITY_TYPES)[number];

export interface Argon2idParameters {
  algorithm: "argon2id";
  algorithmVersion: 19;
  memoryKiB: number;
  iterations: number;
  parallelism: 1;
  outputBytes: 32;
}

// This remains a benchmark candidate, not a released per-profile parameter set.
export const ARGON2ID_BENCHMARK_CANDIDATE: Readonly<Argon2idParameters> = {
  algorithm: "argon2id",
  algorithmVersion: 19,
  memoryKiB: 65_536,
  iterations: 3,
  parallelism: 1,
  outputBytes: ARGON2ID_OUTPUT_BYTES,
};

// Bounds are checked before the worker allocates memory. They are an input-safety
// boundary, not permission to silently choose a weaker per-device parameter set.
export const ARGON2ID_PARAMETER_BOUNDS = {
  memoryKiB: { min: 19_456, max: 131_072 },
  iterations: { min: 2, max: 6 },
  parallelism: { min: 1, max: 1 },
  outputBytes: { min: 32, max: 32 },
} as const;
