import "client-only";

import { buildRecordAad, createCryptoId } from "./aad";
import {
  base64UrlToBytes,
  bytesToBase64Url,
  clearBytes,
  decodeUtf8,
  encodeUtf8,
} from "./bytes";
import { AES_GCM_TAG_BITS, RECORD_ENVELOPE_VERSION } from "./constants";
import { VaultCryptoValidationError } from "./errors";
import { decryptRecordBytes, encryptRecordBytes } from "./web-crypto";
import type { VaultItem } from "../vault-data.types";
import {
  GENERIC_SECRET_ITEM_TYPE,
  GENERIC_SECRET_LIMITS,
  GENERIC_SECRET_PAYLOAD_VERSION,
  MAXIMUM_VAULT_ITEM_PLAINTEXT_BYTES,
  VAULT_ITEM_ENTITY_TYPE,
  type GenericSecretInput,
  type NewVaultItemCiphertext,
  type VaultItemCiphertext,
} from "../vault-item.types";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

interface GenericSecretPayloadV1 {
  payloadVersion: 1;
  title: string;
  value: string;
  notes: string | null;
  tags: string[];
}

function codePointLength(value: string): number {
  return Array.from(value).length;
}

function assertText(
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

function validateGenericSecretInput(input: unknown): GenericSecretInput {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new VaultCryptoValidationError("Generic secret is invalid.");
  }
  const record = input as Record<string, unknown>;
  if (
    record.projectId !== null &&
    (typeof record.projectId !== "string" || !UUID_V4_PATTERN.test(record.projectId))
  ) {
    throw new VaultCryptoValidationError("Project ID is invalid.");
  }
  assertText(record.title, "Title", GENERIC_SECRET_LIMITS.titleCodePoints, false);
  assertText(record.value, "Secret value", GENERIC_SECRET_LIMITS.valueCodePoints, false);
  if (record.notes !== null) {
    assertText(record.notes, "Notes", GENERIC_SECRET_LIMITS.notesCodePoints, true);
  }
  if (!Array.isArray(record.tags) || record.tags.length > GENERIC_SECRET_LIMITS.tagCount) {
    throw new VaultCryptoValidationError("Tags are invalid.");
  }
  const seenTags = new Set<string>();
  const tags: string[] = [];
  for (const tag of record.tags) {
    assertText(tag, "Tag", GENERIC_SECRET_LIMITS.tagCodePoints, false);
    if (tag !== tag.trim() || seenTags.has(tag)) {
      throw new VaultCryptoValidationError("Tags are invalid.");
    }
    seenTags.add(tag);
    tags.push(tag);
  }
  return {
    projectId: record.projectId,
    title: record.title,
    value: record.value,
    notes: record.notes,
    tags,
  };
}

function parseGenericSecretPayload(value: unknown, projectId: string | null): GenericSecretPayloadV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new VaultCryptoValidationError("Decrypted generic secret is invalid.");
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const expectedKeys = ["notes", "payloadVersion", "tags", "title", "value"];
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index]) ||
    record.payloadVersion !== GENERIC_SECRET_PAYLOAD_VERSION
  ) {
    throw new VaultCryptoValidationError("Decrypted generic secret is invalid.");
  }
  const validated = validateGenericSecretInput({
    projectId,
    title: record.title,
    value: record.value,
    notes: record.notes,
    tags: record.tags,
  });
  return {
    payloadVersion: GENERIC_SECRET_PAYLOAD_VERSION,
    title: validated.title,
    value: validated.value,
    notes: validated.notes,
    tags: validated.tags,
  };
}

function serializeGenericSecret(input: GenericSecretInput): Uint8Array {
  const validated = validateGenericSecretInput(input);
  const payload: GenericSecretPayloadV1 = {
    payloadVersion: GENERIC_SECRET_PAYLOAD_VERSION,
    title: validated.title,
    value: validated.value,
    notes: validated.notes,
    tags: validated.tags,
  };
  const bytes = encodeUtf8(JSON.stringify(payload));
  if (bytes.byteLength > MAXIMUM_VAULT_ITEM_PLAINTEXT_BYTES) {
    clearBytes(bytes);
    throw new VaultCryptoValidationError("Generic secret is too large.");
  }
  return bytes;
}

function plaintextItem(
  id: string,
  projectId: string | null,
  payload: GenericSecretPayloadV1,
  updatedAt: string,
): VaultItem {
  return {
    id,
    ...(projectId ? { projectId } : {}),
    type: GENERIC_SECRET_ITEM_TYPE,
    title: payload.title,
    fields: [{ key: "value", label: "Secret", value: payload.value, secret: true }],
    notes: payload.notes ?? undefined,
    tags: payload.tags,
    updatedAt,
  };
}

export function prepareGenericSecretInput(input: {
  projectId: string | null;
  title: string;
  value: string;
  notes: string;
  tags: string;
}): GenericSecretInput {
  const tags = input.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag, index, all) => tag.length > 0 && all.indexOf(tag) === index);
  return validateGenericSecretInput({
    projectId: input.projectId,
    title: input.title.trim(),
    value: input.value,
    notes: input.notes.length > 0 ? input.notes : null,
    tags,
  });
}

export async function encryptGenericSecret(
  ownerId: string,
  dek: CryptoKey,
  input: GenericSecretInput,
  existingId?: string,
): Promise<NewVaultItemCiphertext> {
  const id = existingId ?? createCryptoId();
  const plaintext = serializeGenericSecret(input);
  const aad = buildRecordAad(
    ownerId,
    id,
    VAULT_ITEM_ENTITY_TYPE,
    input.projectId ? [input.projectId] : [],
  );
  try {
    const encrypted = await encryptRecordBytes(dek, plaintext, aad);
    try {
      return {
        id,
        projectId: input.projectId,
        itemType: GENERIC_SECRET_ITEM_TYPE,
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
    clearBytes(plaintext, aad);
  }
}

export async function decryptGenericSecret(
  ownerId: string,
  dek: CryptoKey,
  item: VaultItemCiphertext,
): Promise<VaultItem> {
  if (item.itemType !== GENERIC_SECRET_ITEM_TYPE) {
    throw new VaultCryptoValidationError("Vault item type is unsupported.");
  }
  const nonce = base64UrlToBytes(item.envelope.nonce);
  const ciphertext = base64UrlToBytes(item.envelope.ciphertext);
  const aad = buildRecordAad(
    ownerId,
    item.id,
    VAULT_ITEM_ENTITY_TYPE,
    item.projectId ? [item.projectId] : [],
  );
  let plaintext: Uint8Array | undefined;
  try {
    plaintext = await decryptRecordBytes(dek, ciphertext, nonce, aad);
    if (plaintext.byteLength > MAXIMUM_VAULT_ITEM_PLAINTEXT_BYTES) {
      throw new VaultCryptoValidationError("Decrypted generic secret is too large.");
    }
    const serialized = decodeUtf8(plaintext);
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized) as unknown;
    } catch {
      throw new VaultCryptoValidationError("Decrypted generic secret is invalid.");
    }
    const payload = parseGenericSecretPayload(parsed, item.projectId);
    if (JSON.stringify(payload) !== serialized) {
      throw new VaultCryptoValidationError("Decrypted generic secret is invalid.");
    }
    return plaintextItem(item.id, item.projectId, payload, item.updatedAt);
  } finally {
    clearBytes(nonce, ciphertext, aad, plaintext);
  }
}
