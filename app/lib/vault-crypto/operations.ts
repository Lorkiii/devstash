import "client-only";

import {
  AES_GCM_NONCE_BYTES,
  ARGON2ID_BENCHMARK_CANDIDATE,
  ARGON2ID_SALT_BYTES,
  PASSPHRASE_ENCODING,
  RECOVERY_ENTROPY_BYTES,
  RECOVERY_HKDF_INFO,
  RECOVERY_PHRASE_ENCODING,
  RECOVERY_SALT_BYTES,
  VAULT_PROFILE_FORMAT_VERSION,
  type Argon2idParameters,
} from "./constants";
import { buildPassphraseWrapAad, buildRecoveryWrapAad } from "./aad";
import { deriveArgon2idKeyBytes } from "./argon2id";
import {
  assertByteLength,
  base64UrlToBytes,
  bytesToBase64Url,
  clearBytes,
  randomBytes,
} from "./bytes";
import { VaultCryptoAuthenticationError } from "./errors";
import { decodeRecoveryPhrase, encodeRecoveryEntropy } from "./recovery-phrase";
import { parseVaultEncryptionProfile } from "./profile";
import {
  decryptAesGcm,
  deriveRecoveryWrappingKey,
  generateRawDek,
  importAesGcmKey,
  importDek,
  wrapRawDek,
} from "./web-crypto";
import type { VaultEncryptionProfile, VaultLifecycleDraft } from "../vault-profile.types";

function profileArgon2idParameters(profile: VaultEncryptionProfile): Argon2idParameters {
  return {
    algorithm: profile.kdf.algorithm,
    algorithmVersion: profile.kdf.algorithmVersion,
    memoryKiB: profile.kdf.memoryKiB,
    iterations: profile.kdf.iterations,
    parallelism: profile.kdf.parallelism,
    outputBytes: profile.kdf.outputBytes,
  };
}

function bytesMatch(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

async function derivePassphraseWrappingKey(
  passphraseBytes: Uint8Array,
  salt: Uint8Array,
  parameters: Argon2idParameters,
): Promise<CryptoKey> {
  const keyBytes = await deriveArgon2idKeyBytes(passphraseBytes, salt, parameters);
  try {
    return await importAesGcmKey(keyBytes);
  } finally {
    clearBytes(keyBytes);
  }
}

async function unwrapRawDekWithPassphrase(
  ownerId: string,
  profile: VaultEncryptionProfile,
  passphraseBytes: Uint8Array,
): Promise<Uint8Array> {
  const salt = base64UrlToBytes(profile.kdf.salt);
  const nonce = base64UrlToBytes(profile.passphraseKeyWrap.nonce);
  const wrappedDek = base64UrlToBytes(profile.passphraseKeyWrap.wrappedDek);
  const aad = buildPassphraseWrapAad(ownerId, profile.profileId, profile.passphraseWrapRevision);
  try {
    const wrappingKey = await derivePassphraseWrappingKey(
      passphraseBytes,
      salt,
      profileArgon2idParameters(profile),
    );
    const rawDek = await decryptAesGcm(wrappingKey, wrappedDek, nonce, aad);
    assertByteLength(rawDek, 32, "DEK");
    return rawDek;
  } finally {
    clearBytes(salt, nonce, wrappedDek, aad);
  }
}

async function unwrapRawDekWithRecoveryPhrase(
  ownerId: string,
  profile: VaultEncryptionProfile,
  recoveryPhrase: string,
): Promise<Uint8Array> {
  const entropy = decodeRecoveryPhrase(recoveryPhrase);
  const salt = base64UrlToBytes(profile.recovery.kdf.salt);
  const nonce = base64UrlToBytes(profile.recovery.keyWrap.nonce);
  const wrappedDek = base64UrlToBytes(profile.recovery.keyWrap.wrappedDek);
  const aad = buildRecoveryWrapAad(ownerId, profile.profileId, profile.recoveryWrapRevision);
  try {
    const wrappingKey = await deriveRecoveryWrappingKey(entropy, salt);
    const rawDek = await decryptAesGcm(wrappingKey, wrappedDek, nonce, aad);
    assertByteLength(rawDek, 32, "DEK");
    return rawDek;
  } finally {
    clearBytes(entropy, salt, nonce, wrappedDek, aad);
  }
}

async function verifyWrappedDek(
  wrappingKey: CryptoKey,
  wrappedDek: Uint8Array,
  nonce: Uint8Array,
  aad: Uint8Array,
  expectedRawDek: Uint8Array,
): Promise<void> {
  const roundTrip = await decryptAesGcm(wrappingKey, wrappedDek, nonce, aad);
  try {
    if (!bytesMatch(roundTrip, expectedRawDek)) throw new VaultCryptoAuthenticationError();
  } finally {
    clearBytes(roundTrip);
  }
}

export async function createVaultSetupDraft(
  ownerId: string,
  profileId: string,
  passphraseBytes: Uint8Array,
): Promise<VaultLifecycleDraft & { recoveryPhrase: string }> {
  const passphraseSalt = randomBytes(ARGON2ID_SALT_BYTES);
  const recoveryEntropy = randomBytes(RECOVERY_ENTROPY_BYTES);
  const recoverySalt = randomBytes(RECOVERY_SALT_BYTES);
  const rawDek = generateRawDek();
  const passphraseNonce = randomBytes(AES_GCM_NONCE_BYTES);
  const recoveryNonce = randomBytes(AES_GCM_NONCE_BYTES);
  const passphraseAad = buildPassphraseWrapAad(ownerId, profileId, 1);
  const recoveryAad = buildRecoveryWrapAad(ownerId, profileId, 1);
  let passphraseWrappedDek: Uint8Array | undefined;
  let recoveryWrappedDek: Uint8Array | undefined;

  try {
    const passphraseKey = await derivePassphraseWrappingKey(
      passphraseBytes,
      passphraseSalt,
      ARGON2ID_BENCHMARK_CANDIDATE,
    );
    const recoveryKey = await deriveRecoveryWrappingKey(recoveryEntropy, recoverySalt);
    passphraseWrappedDek = await wrapRawDek(passphraseKey, rawDek, passphraseNonce, passphraseAad);
    recoveryWrappedDek = await wrapRawDek(recoveryKey, rawDek, recoveryNonce, recoveryAad);
    await verifyWrappedDek(passphraseKey, passphraseWrappedDek, passphraseNonce, passphraseAad, rawDek);
    await verifyWrappedDek(recoveryKey, recoveryWrappedDek, recoveryNonce, recoveryAad, rawDek);

    const profile: VaultEncryptionProfile = {
      profileId,
      profileFormatVersion: VAULT_PROFILE_FORMAT_VERSION,
      profileRevision: 1,
      passphraseWrapRevision: 1,
      recoveryWrapRevision: 1,
      passphraseEncoding: PASSPHRASE_ENCODING,
      kdf: {
        ...ARGON2ID_BENCHMARK_CANDIDATE,
        salt: bytesToBase64Url(passphraseSalt),
      },
      passphraseKeyWrap: {
        algorithm: "AES-256-GCM",
        nonce: bytesToBase64Url(passphraseNonce),
        tagBits: 128,
        wrappedDek: bytesToBase64Url(passphraseWrappedDek),
      },
      recovery: {
        phraseEncoding: RECOVERY_PHRASE_ENCODING,
        kdf: {
          algorithm: "HKDF-SHA-256",
          salt: bytesToBase64Url(recoverySalt),
          info: RECOVERY_HKDF_INFO,
          outputBytes: 32,
        },
        keyWrap: {
          algorithm: "AES-256-GCM",
          nonce: bytesToBase64Url(recoveryNonce),
          tagBits: 128,
          wrappedDek: bytesToBase64Url(recoveryWrappedDek),
        },
      },
    };

    return {
      profile,
      dek: await importDek(rawDek),
      recoveryPhrase: encodeRecoveryEntropy(recoveryEntropy),
    };
  } finally {
    clearBytes(
      passphraseSalt,
      recoveryEntropy,
      recoverySalt,
      rawDek,
      passphraseNonce,
      recoveryNonce,
      passphraseAad,
      recoveryAad,
      passphraseWrappedDek,
      recoveryWrappedDek,
    );
  }
}

export async function unlockVaultWithPassphrase(
  ownerId: string,
  suppliedProfile: unknown,
  passphraseBytes: Uint8Array,
): Promise<VaultLifecycleDraft> {
  const profile = parseVaultEncryptionProfile(suppliedProfile);
  const rawDek = await unwrapRawDekWithPassphrase(ownerId, profile, passphraseBytes);
  try {
    return { profile, dek: await importDek(rawDek) };
  } finally {
    clearBytes(rawDek);
  }
}

async function replacePassphraseWrapper(
  ownerId: string,
  profile: VaultEncryptionProfile,
  rawDek: Uint8Array,
  newPassphraseBytes: Uint8Array,
): Promise<VaultLifecycleDraft> {
  const salt = randomBytes(ARGON2ID_SALT_BYTES);
  const nonce = randomBytes(AES_GCM_NONCE_BYTES);
  const nextWrapRevision = profile.passphraseWrapRevision + 1;
  const aad = buildPassphraseWrapAad(ownerId, profile.profileId, nextWrapRevision);
  let wrappedDek: Uint8Array | undefined;
  try {
    const wrappingKey = await derivePassphraseWrappingKey(
      newPassphraseBytes,
      salt,
      ARGON2ID_BENCHMARK_CANDIDATE,
    );
    wrappedDek = await wrapRawDek(wrappingKey, rawDek, nonce, aad);
    await verifyWrappedDek(wrappingKey, wrappedDek, nonce, aad, rawDek);
    return {
      dek: await importDek(rawDek),
      profile: {
        ...profile,
        profileRevision: profile.profileRevision + 1,
        passphraseWrapRevision: nextWrapRevision,
        kdf: { ...ARGON2ID_BENCHMARK_CANDIDATE, salt: bytesToBase64Url(salt) },
        passphraseKeyWrap: {
          algorithm: "AES-256-GCM",
          nonce: bytesToBase64Url(nonce),
          tagBits: 128,
          wrappedDek: bytesToBase64Url(wrappedDek),
        },
      },
    };
  } finally {
    clearBytes(salt, nonce, aad, wrappedDek);
  }
}

export async function changeVaultPassphrase(
  ownerId: string,
  suppliedProfile: unknown,
  currentPassphraseBytes: Uint8Array,
  newPassphraseBytes: Uint8Array,
): Promise<VaultLifecycleDraft> {
  const profile = parseVaultEncryptionProfile(suppliedProfile);
  const rawDek = await unwrapRawDekWithPassphrase(ownerId, profile, currentPassphraseBytes);
  try {
    return await replacePassphraseWrapper(ownerId, profile, rawDek, newPassphraseBytes);
  } finally {
    clearBytes(rawDek);
  }
}

export async function recoverVaultAndReplacePassphrase(
  ownerId: string,
  suppliedProfile: unknown,
  recoveryPhrase: string,
  newPassphraseBytes: Uint8Array,
): Promise<VaultLifecycleDraft> {
  const profile = parseVaultEncryptionProfile(suppliedProfile);
  const rawDek = await unwrapRawDekWithRecoveryPhrase(ownerId, profile, recoveryPhrase);
  try {
    return await replacePassphraseWrapper(ownerId, profile, rawDek, newPassphraseBytes);
  } finally {
    clearBytes(rawDek);
  }
}

export async function createRecoveryRotationDraft(
  ownerId: string,
  suppliedProfile: unknown,
  currentPassphraseBytes: Uint8Array,
): Promise<VaultLifecycleDraft & { recoveryPhrase: string }> {
  const profile = parseVaultEncryptionProfile(suppliedProfile);
  const rawDek = await unwrapRawDekWithPassphrase(ownerId, profile, currentPassphraseBytes);
  const entropy = randomBytes(RECOVERY_ENTROPY_BYTES);
  const salt = randomBytes(RECOVERY_SALT_BYTES);
  const nonce = randomBytes(AES_GCM_NONCE_BYTES);
  const nextWrapRevision = profile.recoveryWrapRevision + 1;
  const aad = buildRecoveryWrapAad(ownerId, profile.profileId, nextWrapRevision);
  let wrappedDek: Uint8Array | undefined;
  try {
    const recoveryKey = await deriveRecoveryWrappingKey(entropy, salt);
    wrappedDek = await wrapRawDek(recoveryKey, rawDek, nonce, aad);
    await verifyWrappedDek(recoveryKey, wrappedDek, nonce, aad, rawDek);
    return {
      dek: await importDek(rawDek),
      recoveryPhrase: encodeRecoveryEntropy(entropy),
      profile: {
        ...profile,
        profileRevision: profile.profileRevision + 1,
        recoveryWrapRevision: nextWrapRevision,
        recovery: {
          phraseEncoding: RECOVERY_PHRASE_ENCODING,
          kdf: {
            algorithm: "HKDF-SHA-256",
            salt: bytesToBase64Url(salt),
            info: RECOVERY_HKDF_INFO,
            outputBytes: 32,
          },
          keyWrap: {
            algorithm: "AES-256-GCM",
            nonce: bytesToBase64Url(nonce),
            tagBits: 128,
            wrappedDek: bytesToBase64Url(wrappedDek),
          },
        },
      },
    };
  } finally {
    clearBytes(rawDek, entropy, salt, nonce, aad, wrappedDek);
  }
}
