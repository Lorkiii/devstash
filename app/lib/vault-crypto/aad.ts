import {
  ENCRYPTED_ENTITY_TYPES,
  RECORD_ENVELOPE_VERSION,
  VAULT_PROFILE_FORMAT_VERSION,
  type EncryptedEntityType,
} from "./constants";
import { encodeUtf8 } from "./bytes";
import { VaultCryptoValidationError } from "./errors";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const OWNER_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/u;

function assertOwnerId(ownerId: string): void {
  if (!OWNER_ID_PATTERN.test(ownerId)) {
    throw new VaultCryptoValidationError("Owner ID is invalid.");
  }
}

function assertUuidV4(value: string, label: string): void {
  if (!UUID_V4_PATTERN.test(value)) {
    throw new VaultCryptoValidationError(`${label} must be a canonical lowercase UUID v4.`);
  }
}

function assertRevision(revision: number): void {
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new VaultCryptoValidationError("Wrap revision must be a positive integer.");
  }
}

function createProfileWrapAad(
  wrapType: "passphrase-wrap" | "recovery-wrap",
  ownerId: string,
  profileId: string,
  wrapRevision: number,
): Uint8Array {
  assertOwnerId(ownerId);
  assertUuidV4(profileId, "Profile ID");
  assertRevision(wrapRevision);
  return encodeUtf8(JSON.stringify([
    "devstash",
    "vault-profile",
    wrapType,
    VAULT_PROFILE_FORMAT_VERSION,
    ownerId,
    profileId,
    wrapRevision,
  ]));
}

export function createCryptoId(): string {
  if (!globalThis.crypto?.randomUUID) {
    throw new VaultCryptoValidationError("Secure UUID generation is unavailable.");
  }
  return globalThis.crypto.randomUUID();
}

export function buildPassphraseWrapAad(
  ownerId: string,
  profileId: string,
  passphraseWrapRevision: number,
): Uint8Array {
  return createProfileWrapAad("passphrase-wrap", ownerId, profileId, passphraseWrapRevision);
}

export function buildRecoveryWrapAad(
  ownerId: string,
  profileId: string,
  recoveryWrapRevision: number,
): Uint8Array {
  return createProfileWrapAad("recovery-wrap", ownerId, profileId, recoveryWrapRevision);
}

export function buildRecordAad(
  ownerId: string,
  recordId: string,
  entityType: EncryptedEntityType,
  relationshipIds: readonly string[],
): Uint8Array {
  assertOwnerId(ownerId);
  assertUuidV4(recordId, "Record ID");
  if (!ENCRYPTED_ENTITY_TYPES.includes(entityType)) {
    throw new VaultCryptoValidationError("Encrypted entity type is unsupported.");
  }
  for (const relationshipId of relationshipIds) {
    assertUuidV4(relationshipId, "Relationship ID");
  }
  return encodeUtf8(JSON.stringify([
    "devstash",
    "encrypted-record",
    RECORD_ENVELOPE_VERSION,
    ownerId,
    recordId,
    entityType,
    relationshipIds,
  ]));
}
