import "client-only";

import {
  GENERIC_SECRET_ITEM_TYPE,
  MAXIMUM_VAULT_ITEM_CIPHERTEXT_BYTES,
  type NewVaultItemCiphertext,
  type ReplaceVaultItemCiphertext,
  type VaultItemCiphertext,
  type VaultItemEnvelope,
} from "./vault-item.types";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;
const MAXIMUM_CIPHERTEXT_CHARACTERS = Math.ceil(MAXIMUM_VAULT_ITEM_CIPHERTEXT_BYTES * 4 / 3);

export class VaultItemRequestError extends Error {
  override readonly name = "VaultItemRequestError";

  constructor(readonly status: number) {
    super("Vault item request failed.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return keys.length === sortedExpected.length &&
    keys.every((key, index) => key === sortedExpected[index]);
}

function isCanonicalBase64Url(value: unknown, maximumCharacters: number): value is string {
  return typeof value === "string" &&
    value.length <= maximumCharacters &&
    value.length % 4 !== 1 &&
    BASE64URL_PATTERN.test(value);
}

function parseEnvelope(value: unknown): VaultItemEnvelope {
  if (!isRecord(value) || !hasExactKeys(value, [
    "envelopeVersion",
    "algorithm",
    "nonce",
    "tagBits",
    "ciphertext",
  ])) {
    throw new VaultItemRequestError(500);
  }
  if (
    value.envelopeVersion !== 1 ||
    value.algorithm !== "AES-256-GCM" ||
    value.tagBits !== 128 ||
    !isCanonicalBase64Url(value.nonce, 16) ||
    value.nonce.length !== 16 ||
    !isCanonicalBase64Url(value.ciphertext, MAXIMUM_CIPHERTEXT_CHARACTERS) ||
    value.ciphertext.length < 22
  ) {
    throw new VaultItemRequestError(500);
  }
  return {
    envelopeVersion: 1,
    algorithm: "AES-256-GCM",
    nonce: value.nonce,
    tagBits: 128,
    ciphertext: value.ciphertext,
  };
}

function parseTimestamp(value: unknown): string {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new VaultItemRequestError(500);
  }
  return value;
}

export function parseVaultItemCiphertext(value: unknown): VaultItemCiphertext {
  if (!isRecord(value) || !hasExactKeys(value, [
    "id",
    "projectId",
    "itemType",
    "envelope",
    "createdAt",
    "updatedAt",
  ])) {
    throw new VaultItemRequestError(500);
  }
  if (
    typeof value.id !== "string" ||
    !UUID_V4_PATTERN.test(value.id) ||
    (value.projectId !== null &&
      (typeof value.projectId !== "string" || !UUID_V4_PATTERN.test(value.projectId))) ||
    value.itemType !== GENERIC_SECRET_ITEM_TYPE
  ) {
    throw new VaultItemRequestError(500);
  }
  return {
    id: value.id,
    projectId: value.projectId,
    itemType: GENERIC_SECRET_ITEM_TYPE,
    envelope: parseEnvelope(value.envelope),
    createdAt: parseTimestamp(value.createdAt),
    updatedAt: parseTimestamp(value.updatedAt),
  };
}

function isSuccessEnvelope(value: unknown): value is { success: true; data: unknown } {
  return isRecord(value) && value.success === true && "data" in value;
}

async function readResponse(response: Response): Promise<unknown> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new VaultItemRequestError(response.status || 500);
  }
  if (!response.ok || !isSuccessEnvelope(payload)) {
    throw new VaultItemRequestError(response.status || 500);
  }
  return payload.data;
}

export async function fetchVaultItems(signal?: AbortSignal): Promise<VaultItemCiphertext[]> {
  const response = await fetch("/api/vault/items", {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  const data = await readResponse(response);
  if (!Array.isArray(data)) throw new VaultItemRequestError(500);
  return data.map(parseVaultItemCiphertext);
}

export async function createVaultItem(
  item: NewVaultItemCiphertext,
  signal?: AbortSignal,
): Promise<VaultItemCiphertext> {
  const response = await fetch("/api/vault/items", {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item }),
    signal,
  });
  return parseVaultItemCiphertext(await readResponse(response));
}

export async function replaceVaultItem(
  id: string,
  item: ReplaceVaultItemCiphertext,
  signal?: AbortSignal,
): Promise<VaultItemCiphertext> {
  const response = await fetch(`/api/vault/items/${encodeURIComponent(id)}`, {
    method: "PATCH",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item }),
    signal,
  });
  return parseVaultItemCiphertext(await readResponse(response));
}

export async function removeVaultItem(id: string, signal?: AbortSignal): Promise<void> {
  const response = await fetch(`/api/vault/items/${encodeURIComponent(id)}`, {
    method: "DELETE",
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  const data = await readResponse(response);
  if (!isRecord(data) || !hasExactKeys(data, ["id"]) || data.id !== id) {
    throw new VaultItemRequestError(500);
  }
}
