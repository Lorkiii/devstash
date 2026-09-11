import "server-only";

import { z } from "zod";

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/u;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

function encodedBytes(length: number) {
  return z.string().superRefine((value, context) => {
    if (!BASE64URL_PATTERN.test(value) || value.includes("=") || value.length % 4 === 1) {
      context.addIssue({ code: "custom", message: "Invalid binary encoding." });
      return;
    }
    const bytes = Buffer.from(value, "base64url");
    if (bytes.byteLength !== length || bytes.toString("base64url") !== value) {
      context.addIssue({ code: "custom", message: "Invalid binary length or encoding." });
    }
  });
}

const revision = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);

export const vaultKdfSchema = z.strictObject({
  algorithm: z.literal("argon2id"),
  algorithmVersion: z.literal(19),
  salt: encodedBytes(16),
  memoryKiB: z.number().int().min(19_456).max(131_072),
  iterations: z.number().int().min(2).max(6),
  parallelism: z.literal(1),
  outputBytes: z.literal(32),
});

export const vaultKeyWrapSchema = z.strictObject({
  algorithm: z.literal("AES-256-GCM"),
  nonce: encodedBytes(12),
  tagBits: z.literal(128),
  wrappedDek: encodedBytes(48),
});

export const vaultRecoverySchema = z.strictObject({
  phraseEncoding: z.literal("bip39-english-256-v1"),
  kdf: z.strictObject({
    algorithm: z.literal("HKDF-SHA-256"),
    salt: encodedBytes(32),
    info: z.literal("devstash:recovery-wrap:v1"),
    outputBytes: z.literal(32),
  }),
  keyWrap: vaultKeyWrapSchema,
});

export const vaultEncryptionProfileSchema = z.strictObject({
  profileId: z.string().regex(UUID_V4_PATTERN),
  profileFormatVersion: z.literal(1),
  profileRevision: revision,
  passphraseWrapRevision: revision,
  recoveryWrapRevision: revision,
  passphraseEncoding: z.literal("utf8-nfc-v1"),
  kdf: vaultKdfSchema,
  passphraseKeyWrap: vaultKeyWrapSchema,
  recovery: vaultRecoverySchema,
});

export const createVaultProfileSchema = z.strictObject({
  profile: vaultEncryptionProfileSchema.extend({
    profileRevision: z.literal(1),
    passphraseWrapRevision: z.literal(1),
    recoveryWrapRevision: z.literal(1),
  }),
});

const replacePassphraseSchema = z.strictObject({
  action: z.literal("replace-passphrase"),
  expectedProfileRevision: revision,
  expectedPassphraseWrapRevision: revision,
  kdf: vaultKdfSchema,
  passphraseKeyWrap: vaultKeyWrapSchema,
});

const replaceRecoverySchema = z.strictObject({
  action: z.literal("replace-recovery"),
  expectedProfileRevision: revision,
  expectedRecoveryWrapRevision: revision,
  recovery: vaultRecoverySchema,
});

export const updateVaultProfileSchema = z.discriminatedUnion("action", [
  replacePassphraseSchema,
  replaceRecoverySchema,
]);

export type CreateVaultProfileInput = z.infer<typeof createVaultProfileSchema>;
export type UpdateVaultProfileInput = z.infer<typeof updateVaultProfileSchema>;
