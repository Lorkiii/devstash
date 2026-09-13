import "client-only";

import type { EncryptedEntityType } from "./constants";
import { AES_GCM_TAG_BITS, RECORD_ENVELOPE_VERSION } from "./constants";
import { buildRecordAad, createCryptoId } from "./aad";
import {
  base64UrlToBytes,
  bytesToBase64Url,
  clearBytes,
  decodeUtf8,
  encodeUtf8,
} from "./bytes";
import { VaultCryptoValidationError } from "./errors";
import { decryptRecordBytes, encryptRecordBytes } from "./web-crypto";
import type { WorkspaceEnvelope } from "../workspace.types";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

export function codePointLength(value: string): number {
  return Array.from(value).length;
}

export function assertWorkspaceText(
  value: unknown,
  label: string,
  maximumCodePoints: number,
  allowEmpty: boolean,
): asserts value is string {
  if (
    typeof value !== "string" ||
    (!allowEmpty && value.length === 0) ||
    codePointLength(value) > maximumCodePoints
  ) {
    throw new VaultCryptoValidationError(`${label} is invalid.`);
  }
  encodeUtf8(value);
}

export function assertWorkspaceId(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !UUID_V4_PATTERN.test(value)) {
    throw new VaultCryptoValidationError(`${label} is invalid.`);
  }
}

export function assertExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
  message: string,
): void {
  const keys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new VaultCryptoValidationError(message);
  }
}

export function assertCanonicalDate(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new VaultCryptoValidationError("Due date is invalid.");
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new VaultCryptoValidationError("Due date is invalid.");
  }
}

export function assertCanonicalTags(
  value: unknown,
  maximumCount: number,
  maximumCodePoints: number,
): string[] {
  if (!Array.isArray(value) || value.length > maximumCount) {
    throw new VaultCryptoValidationError("Tags are invalid.");
  }
  const seen = new Set<string>();
  return value.map((tag) => {
    assertWorkspaceText(tag, "Tag", maximumCodePoints, false);
    if (tag !== tag.trim() || seen.has(tag)) {
      throw new VaultCryptoValidationError("Tags are invalid.");
    }
    seen.add(tag);
    return tag;
  });
}

export function serializeWorkspacePayload(
  payload: object,
  maximumBytes: number,
  label: string,
): Uint8Array {
  const bytes = encodeUtf8(JSON.stringify(payload));
  if (bytes.byteLength > maximumBytes) {
    clearBytes(bytes);
    throw new VaultCryptoValidationError(`${label} is too large.`);
  }
  return bytes;
}

export async function encryptWorkspaceRecord(
  ownerId: string,
  dek: CryptoKey,
  entityType: EncryptedEntityType,
  relationshipIds: readonly string[],
  plaintext: Uint8Array,
  existingId?: string,
): Promise<{ id: string; envelope: WorkspaceEnvelope }> {
  const id = existingId ?? createCryptoId();
  const aad = buildRecordAad(ownerId, id, entityType, relationshipIds);
  try {
    const encrypted = await encryptRecordBytes(dek, plaintext, aad);
    try {
      return {
        id,
        envelope: {
          envelopeVersion: RECORD_ENVELOPE_VERSION,
          algorithm: "AES-256-GCM",
          nonce: bytesToBase64Url(encrypted.nonce),
          tagBits: AES_GCM_TAG_BITS,
          ciphertext: bytesToBase64Url(encrypted.ciphertext),
        },
      };
    } finally {
      clearBytes(encrypted.nonce, encrypted.ciphertext);
    }
  } finally {
    clearBytes(aad);
  }
}

export async function decryptWorkspaceRecord(
  ownerId: string,
  dek: CryptoKey,
  id: string,
  entityType: EncryptedEntityType,
  relationshipIds: readonly string[],
  envelope: WorkspaceEnvelope,
  maximumBytes: number,
  label: string,
): Promise<string> {
  const nonce = base64UrlToBytes(envelope.nonce);
  const ciphertext = base64UrlToBytes(envelope.ciphertext);
  const aad = buildRecordAad(ownerId, id, entityType, relationshipIds);
  let plaintext: Uint8Array | undefined;
  try {
    plaintext = await decryptRecordBytes(dek, ciphertext, nonce, aad);
    if (plaintext.byteLength > maximumBytes) {
      throw new VaultCryptoValidationError(`Decrypted ${label} is too large.`);
    }
    return decodeUtf8(plaintext);
  } finally {
    clearBytes(nonce, ciphertext, aad, plaintext);
  }
}
