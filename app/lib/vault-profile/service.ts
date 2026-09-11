import "server-only";

import { getAuthEnvironment } from "../auth/environment";
import { getPrisma } from "../prisma";
import type { VaultEncryptionProfileModel } from "@/app/generated/prisma/models/VaultEncryptionProfile";
import type { VaultEncryptionProfile } from "../vault-profile.types";
import {
  vaultEncryptionProfileSchema,
  type CreateVaultProfileInput,
  type UpdateVaultProfileInput,
} from "./validation";

export class VaultProfileConflictError extends Error {
  override readonly name = "VaultProfileConflictError";
}

function database() {
  const environment = getAuthEnvironment();
  if (!environment) throw new Error("Application configuration is unavailable.");
  return getPrisma(environment.databaseUrl);
}

function decodeBytes(value: string): Uint8Array<ArrayBuffer> {
  const decoded = Buffer.from(value, "base64url");
  const bytes = new Uint8Array(decoded.byteLength);
  bytes.set(decoded);
  return bytes;
}

function encodeBytes(value: Uint8Array): string {
  return Buffer.from(value).toString("base64url");
}

function toProfileDto(profile: VaultEncryptionProfileModel): VaultEncryptionProfile {
  const result = vaultEncryptionProfileSchema.safeParse({
    profileId: profile.id,
    profileFormatVersion: profile.profileFormatVersion,
    profileRevision: profile.profileRevision,
    passphraseWrapRevision: profile.passphraseWrapRevision,
    recoveryWrapRevision: profile.recoveryWrapRevision,
    passphraseEncoding: profile.passphraseEncoding,
    kdf: {
      algorithm: profile.kdfAlgorithm,
      algorithmVersion: profile.kdfAlgorithmVersion,
      salt: encodeBytes(profile.kdfSalt),
      memoryKiB: profile.kdfMemoryKiB,
      iterations: profile.kdfIterations,
      parallelism: profile.kdfParallelism,
      outputBytes: profile.kdfOutputBytes,
    },
    passphraseKeyWrap: {
      algorithm: profile.passphraseWrapAlgorithm,
      nonce: encodeBytes(profile.passphraseWrapNonce),
      tagBits: profile.passphraseWrapTagBits,
      wrappedDek: encodeBytes(profile.passphraseWrappedDek),
    },
    recovery: {
      phraseEncoding: profile.recoveryPhraseEncoding,
      kdf: {
        algorithm: profile.recoveryKdfAlgorithm,
        salt: encodeBytes(profile.recoveryKdfSalt),
        info: profile.recoveryKdfInfo,
        outputBytes: profile.recoveryKdfOutputBytes,
      },
      keyWrap: {
        algorithm: profile.recoveryWrapAlgorithm,
        nonce: encodeBytes(profile.recoveryWrapNonce),
        tagBits: profile.recoveryWrapTagBits,
        wrappedDek: encodeBytes(profile.recoveryWrappedDek),
      },
    },
  });
  if (!result.success) throw new Error("Stored vault profile is invalid.");
  return result.data;
}

export async function findVaultProfile(ownerId: string): Promise<VaultEncryptionProfile | null> {
  const profile = await database().vaultEncryptionProfile.findUnique({ where: { ownerId } });
  return profile ? toProfileDto(profile) : null;
}

export async function createVaultProfile(
  ownerId: string,
  input: CreateVaultProfileInput,
): Promise<VaultEncryptionProfile> {
  const { profile } = input;
  try {
    const created = await database().vaultEncryptionProfile.create({
      data: {
        id: profile.profileId,
        ownerId,
        profileFormatVersion: profile.profileFormatVersion,
        profileRevision: profile.profileRevision,
        passphraseWrapRevision: profile.passphraseWrapRevision,
        recoveryWrapRevision: profile.recoveryWrapRevision,
        passphraseEncoding: profile.passphraseEncoding,
        kdfAlgorithm: profile.kdf.algorithm,
        kdfAlgorithmVersion: profile.kdf.algorithmVersion,
        kdfSalt: decodeBytes(profile.kdf.salt),
        kdfMemoryKiB: profile.kdf.memoryKiB,
        kdfIterations: profile.kdf.iterations,
        kdfParallelism: profile.kdf.parallelism,
        kdfOutputBytes: profile.kdf.outputBytes,
        passphraseWrapAlgorithm: profile.passphraseKeyWrap.algorithm,
        passphraseWrapNonce: decodeBytes(profile.passphraseKeyWrap.nonce),
        passphraseWrapTagBits: profile.passphraseKeyWrap.tagBits,
        passphraseWrappedDek: decodeBytes(profile.passphraseKeyWrap.wrappedDek),
        recoveryPhraseEncoding: profile.recovery.phraseEncoding,
        recoveryKdfAlgorithm: profile.recovery.kdf.algorithm,
        recoveryKdfSalt: decodeBytes(profile.recovery.kdf.salt),
        recoveryKdfInfo: profile.recovery.kdf.info,
        recoveryKdfOutputBytes: profile.recovery.kdf.outputBytes,
        recoveryWrapAlgorithm: profile.recovery.keyWrap.algorithm,
        recoveryWrapNonce: decodeBytes(profile.recovery.keyWrap.nonce),
        recoveryWrapTagBits: profile.recovery.keyWrap.tagBits,
        recoveryWrappedDek: decodeBytes(profile.recovery.keyWrap.wrappedDek),
      },
    });
    return toProfileDto(created);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new VaultProfileConflictError();
    }
    throw error;
  }
}

export async function updateVaultProfile(
  ownerId: string,
  input: UpdateVaultProfileInput,
): Promise<VaultEncryptionProfile> {
  const client = database();
  const updatedProfiles = input.action === "replace-passphrase"
    ? await client.vaultEncryptionProfile.updateManyAndReturn({
        where: {
          ownerId,
          profileRevision: input.expectedProfileRevision,
          passphraseWrapRevision: input.expectedPassphraseWrapRevision,
        },
        data: {
          profileRevision: { increment: 1 },
          passphraseWrapRevision: { increment: 1 },
          kdfAlgorithm: input.kdf.algorithm,
          kdfAlgorithmVersion: input.kdf.algorithmVersion,
          kdfSalt: decodeBytes(input.kdf.salt),
          kdfMemoryKiB: input.kdf.memoryKiB,
          kdfIterations: input.kdf.iterations,
          kdfParallelism: input.kdf.parallelism,
          kdfOutputBytes: input.kdf.outputBytes,
          passphraseWrapAlgorithm: input.passphraseKeyWrap.algorithm,
          passphraseWrapNonce: decodeBytes(input.passphraseKeyWrap.nonce),
          passphraseWrapTagBits: input.passphraseKeyWrap.tagBits,
          passphraseWrappedDek: decodeBytes(input.passphraseKeyWrap.wrappedDek),
        },
      })
    : await client.vaultEncryptionProfile.updateManyAndReturn({
        where: {
          ownerId,
          profileRevision: input.expectedProfileRevision,
          recoveryWrapRevision: input.expectedRecoveryWrapRevision,
        },
        data: {
          profileRevision: { increment: 1 },
          recoveryWrapRevision: { increment: 1 },
          recoveryPhraseEncoding: input.recovery.phraseEncoding,
          recoveryKdfAlgorithm: input.recovery.kdf.algorithm,
          recoveryKdfSalt: decodeBytes(input.recovery.kdf.salt),
          recoveryKdfInfo: input.recovery.kdf.info,
          recoveryKdfOutputBytes: input.recovery.kdf.outputBytes,
          recoveryWrapAlgorithm: input.recovery.keyWrap.algorithm,
          recoveryWrapNonce: decodeBytes(input.recovery.keyWrap.nonce),
          recoveryWrapTagBits: input.recovery.keyWrap.tagBits,
          recoveryWrappedDek: decodeBytes(input.recovery.keyWrap.wrappedDek),
        },
      });

  if (updatedProfiles.length !== 1) throw new VaultProfileConflictError();
  return toProfileDto(updatedProfiles[0]);
}
