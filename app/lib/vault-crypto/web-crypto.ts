import "client-only";

import {
  AES_GCM_KEY_BYTES,
  AES_GCM_NONCE_BYTES,
  AES_GCM_TAG_BITS,
  AES_GCM_TAG_BYTES,
  RECOVERY_ENTROPY_BYTES,
  RECOVERY_HKDF_INFO,
  RECOVERY_SALT_BYTES,
} from "./constants";
import { assertByteLength, clearBytes, encodeUtf8, randomBytes, toArrayBuffer } from "./bytes";
import {
  VaultCryptoAuthenticationError,
  VaultCryptoUnavailableError,
  VaultCryptoValidationError,
} from "./errors";

function subtleCrypto(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) throw new VaultCryptoUnavailableError();
  return globalThis.crypto.subtle;
}

export async function importAesGcmKey(
  rawKey: Uint8Array,
  usages: readonly KeyUsage[] = ["encrypt", "decrypt"],
): Promise<CryptoKey> {
  assertByteLength(rawKey, AES_GCM_KEY_BYTES, "AES-GCM key");
  return subtleCrypto().importKey(
    "raw",
    toArrayBuffer(rawKey),
    { name: "AES-GCM", length: 256 },
    false,
    [...usages],
  );
}

export async function deriveRecoveryWrappingKey(
  recoveryEntropy: Uint8Array,
  salt: Uint8Array,
): Promise<CryptoKey> {
  assertByteLength(recoveryEntropy, RECOVERY_ENTROPY_BYTES, "Recovery entropy");
  assertByteLength(salt, RECOVERY_SALT_BYTES, "Recovery HKDF salt");

  const inputKeyMaterial = await subtleCrypto().importKey(
    "raw",
    toArrayBuffer(recoveryEntropy),
    "HKDF",
    false,
    ["deriveKey"],
  );
  return subtleCrypto().deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      info: toArrayBuffer(encodeUtf8(RECOVERY_HKDF_INFO)),
    },
    inputKeyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptAesGcm(
  key: CryptoKey,
  plaintext: Uint8Array,
  nonce: Uint8Array,
  additionalData: Uint8Array,
): Promise<Uint8Array> {
  assertByteLength(nonce, AES_GCM_NONCE_BYTES, "AES-GCM nonce");
  try {
    const encrypted = await subtleCrypto().encrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(nonce),
        additionalData: toArrayBuffer(additionalData),
        tagLength: AES_GCM_TAG_BITS,
      },
      key,
      toArrayBuffer(plaintext),
    );
    return new Uint8Array(encrypted);
  } catch {
    throw new VaultCryptoAuthenticationError();
  }
}

export async function decryptAesGcm(
  key: CryptoKey,
  ciphertextAndTag: Uint8Array,
  nonce: Uint8Array,
  additionalData: Uint8Array,
): Promise<Uint8Array> {
  assertByteLength(nonce, AES_GCM_NONCE_BYTES, "AES-GCM nonce");
  if (ciphertextAndTag.byteLength < AES_GCM_TAG_BYTES) {
    throw new VaultCryptoValidationError("AES-GCM ciphertext is too short.");
  }
  try {
    const decrypted = await subtleCrypto().decrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(nonce),
        additionalData: toArrayBuffer(additionalData),
        tagLength: AES_GCM_TAG_BITS,
      },
      key,
      toArrayBuffer(ciphertextAndTag),
    );
    return new Uint8Array(decrypted);
  } catch {
    throw new VaultCryptoAuthenticationError();
  }
}

export function generateRawDek(): Uint8Array {
  return randomBytes(AES_GCM_KEY_BYTES);
}

export async function importDek(rawDek: Uint8Array): Promise<CryptoKey> {
  return importAesGcmKey(rawDek, ["encrypt", "decrypt"]);
}

export async function wrapRawDek(
  wrappingKey: CryptoKey,
  rawDek: Uint8Array,
  nonce: Uint8Array,
  additionalData: Uint8Array,
): Promise<Uint8Array> {
  assertByteLength(rawDek, AES_GCM_KEY_BYTES, "DEK");
  const wrappedDek = await encryptAesGcm(wrappingKey, rawDek, nonce, additionalData);
  assertByteLength(wrappedDek, AES_GCM_KEY_BYTES + AES_GCM_TAG_BYTES, "Wrapped DEK");
  return wrappedDek;
}

export async function unwrapDek(
  wrappingKey: CryptoKey,
  wrappedDek: Uint8Array,
  nonce: Uint8Array,
  additionalData: Uint8Array,
): Promise<CryptoKey> {
  assertByteLength(wrappedDek, AES_GCM_KEY_BYTES + AES_GCM_TAG_BYTES, "Wrapped DEK");
  const rawDek = await decryptAesGcm(wrappingKey, wrappedDek, nonce, additionalData);
  try {
    assertByteLength(rawDek, AES_GCM_KEY_BYTES, "DEK");
    return await importDek(rawDek);
  } finally {
    clearBytes(rawDek);
  }
}

export interface EncryptedRecordBytes {
  nonce: Uint8Array;
  ciphertext: Uint8Array;
}

export async function encryptRecordBytes(
  dek: CryptoKey,
  plaintext: Uint8Array,
  additionalData: Uint8Array,
  suppliedNonce?: Uint8Array,
): Promise<EncryptedRecordBytes> {
  const nonce = suppliedNonce ? Uint8Array.from(suppliedNonce) : randomBytes(AES_GCM_NONCE_BYTES);
  assertByteLength(nonce, AES_GCM_NONCE_BYTES, "AES-GCM nonce");
  const ciphertext = await encryptAesGcm(dek, plaintext, nonce, additionalData);
  if (ciphertext.byteLength < AES_GCM_TAG_BYTES) {
    throw new VaultCryptoValidationError("Ciphertext is too short for an AES-GCM tag.");
  }
  return { nonce, ciphertext };
}

export async function decryptRecordBytes(
  dek: CryptoKey,
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  additionalData: Uint8Array,
): Promise<Uint8Array> {
  if (!(ciphertext instanceof Uint8Array) || ciphertext.byteLength < AES_GCM_TAG_BYTES) {
    throw new VaultCryptoValidationError("Ciphertext is too short for an AES-GCM tag.");
  }
  return decryptAesGcm(dek, ciphertext, nonce, additionalData);
}
