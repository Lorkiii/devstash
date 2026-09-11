import "client-only";

import { z } from "zod";
import {
  AES_GCM_KEY_BYTES,
  AES_GCM_NONCE_BYTES,
  AES_GCM_TAG_BYTES,
  ARGON2ID_PARAMETER_BOUNDS,
  ARGON2ID_SALT_BYTES,
  PASSPHRASE_ENCODING,
  RECOVERY_HKDF_INFO,
  RECOVERY_PHRASE_ENCODING,
  RECOVERY_SALT_BYTES,
  VAULT_PROFILE_FORMAT_VERSION,
} from "./constants";
import { base64UrlToBytes, clearBytes } from "./bytes";
import type { VaultEncryptionProfile } from "../vault-profile.types";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

function encodedBytes(length: number) {
  return z.string().superRefine((value, context) => {
    let bytes: Uint8Array | undefined;
    try {
      bytes = base64UrlToBytes(value);
      if (bytes.byteLength !== length) {
        context.addIssue({ code: "custom", message: `Expected ${length} encoded bytes.` });
      }
    } catch {
      context.addIssue({ code: "custom", message: "Expected canonical Base64URL." });
    } finally {
      clearBytes(bytes);
    }
  });
}

const positiveRevision = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);

const keyWrapSchema = z.strictObject({
  algorithm: z.literal("AES-256-GCM"),
  nonce: encodedBytes(AES_GCM_NONCE_BYTES),
  tagBits: z.literal(128),
  wrappedDek: encodedBytes(AES_GCM_KEY_BYTES + AES_GCM_TAG_BYTES),
});

const profileSchema = z.strictObject({
  profileId: z.string().regex(UUID_V4_PATTERN),
  profileFormatVersion: z.literal(VAULT_PROFILE_FORMAT_VERSION),
  profileRevision: positiveRevision,
  passphraseWrapRevision: positiveRevision,
  recoveryWrapRevision: positiveRevision,
  passphraseEncoding: z.literal(PASSPHRASE_ENCODING),
  kdf: z.strictObject({
    algorithm: z.literal("argon2id"),
    algorithmVersion: z.literal(19),
    salt: encodedBytes(ARGON2ID_SALT_BYTES),
    memoryKiB: z.number().int()
      .min(ARGON2ID_PARAMETER_BOUNDS.memoryKiB.min)
      .max(ARGON2ID_PARAMETER_BOUNDS.memoryKiB.max),
    iterations: z.number().int()
      .min(ARGON2ID_PARAMETER_BOUNDS.iterations.min)
      .max(ARGON2ID_PARAMETER_BOUNDS.iterations.max),
    parallelism: z.literal(1),
    outputBytes: z.literal(32),
  }),
  passphraseKeyWrap: keyWrapSchema,
  recovery: z.strictObject({
    phraseEncoding: z.literal(RECOVERY_PHRASE_ENCODING),
    kdf: z.strictObject({
      algorithm: z.literal("HKDF-SHA-256"),
      salt: encodedBytes(RECOVERY_SALT_BYTES),
      info: z.literal(RECOVERY_HKDF_INFO),
      outputBytes: z.literal(32),
    }),
    keyWrap: keyWrapSchema,
  }),
});

export function parseVaultEncryptionProfile(value: unknown): VaultEncryptionProfile {
  return profileSchema.parse(value) as VaultEncryptionProfile;
}
