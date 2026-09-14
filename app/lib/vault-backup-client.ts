import "client-only";

import { base64UrlToBytes, clearBytes, encodeUtf8 } from "./vault-crypto/bytes";
import { parseVaultEncryptionProfile } from "./vault-crypto/profile";
import { parseVaultItemCiphertext } from "./vault-item-client";
import {
  MAXIMUM_VAULT_BACKUP_BYTES,
  VAULT_BACKUP_FORMAT,
  VAULT_BACKUP_FORMAT_VERSION,
  VAULT_BACKUP_MANIFEST_VERSION,
  type EncryptedVaultBackup,
  type VaultBackupManifestEnvelope,
  type VaultBackupRestoreResult,
  type VaultBackupRestoreExpectation,
  type VaultBackupSnapshot,
  type VaultCiphertextRecords,
} from "./vault-backup.types";
import { findVaultBackupRelationshipIssues, vaultBackupRecordCounts } from "./vault-backup-validation";
import {
  parseEnvBundleCiphertext,
  parseNoteCiphertext,
  parseProjectCiphertext,
  parseTaskCategoryCiphertext,
  parseTaskCiphertext,
} from "./workspace-client";

export class VaultBackupRequestError extends Error {
  override readonly name = "VaultBackupRequestError";

  constructor(readonly status: number) {
    super("Encrypted backup request failed.");
  }
}

export class VaultBackupFileError extends Error {
  override readonly name = "VaultBackupFileError";
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

function parseTimestamp(value: unknown): string {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new VaultBackupFileError("Encrypted backup timestamp is invalid.");
  }
  return value;
}

function parseArray<T>(
  value: unknown,
  parse: (item: unknown) => T,
): T[] {
  if (!Array.isArray(value)) {
    throw new VaultBackupFileError("Encrypted backup record collection is invalid.");
  }
  try {
    return value.map(parse);
  } catch {
    throw new VaultBackupFileError("Encrypted backup record is invalid.");
  }
}

function parseRecords(value: unknown): VaultCiphertextRecords {
  if (!isRecord(value) || !hasExactKeys(value, [
    "vaultItems",
    "projects",
    "envBundles",
    "notes",
    "taskCategories",
    "tasks",
  ])) {
    throw new VaultBackupFileError("Encrypted backup collections are invalid.");
  }
  const records = {
    vaultItems: parseArray(value.vaultItems, parseVaultItemCiphertext),
    projects: parseArray(value.projects, parseProjectCiphertext),
    envBundles: parseArray(value.envBundles, parseEnvBundleCiphertext),
    notes: parseArray(value.notes, parseNoteCiphertext),
    taskCategories: parseArray(value.taskCategories, parseTaskCategoryCiphertext),
    tasks: parseArray(value.tasks, parseTaskCiphertext),
  };
  for (const collection of Object.values(records)) {
    if (collection.some((record) => Date.parse(record.updatedAt) < Date.parse(record.createdAt))) {
      throw new VaultBackupFileError("Encrypted backup timestamp order is invalid.");
    }
  }
  if (findVaultBackupRelationshipIssues(records).length > 0) {
    throw new VaultBackupFileError("Encrypted backup relationships are invalid.");
  }
  return records;
}

export function parseVaultBackupSnapshot(value: unknown): VaultBackupSnapshot {
  if (!isRecord(value) || !hasExactKeys(value, ["profile", "records"])) {
    throw new VaultBackupFileError("Encrypted backup snapshot is invalid.");
  }
  try {
    return {
      profile: parseVaultEncryptionProfile(value.profile),
      records: parseRecords(value.records),
    };
  } catch (error) {
    if (error instanceof VaultBackupFileError) throw error;
    throw new VaultBackupFileError("Encrypted backup profile is invalid.");
  }
}

function parseManifest(value: unknown): VaultBackupManifestEnvelope {
  if (!isRecord(value) || !hasExactKeys(value, [
    "manifestVersion",
    "algorithm",
    "nonce",
    "tagBits",
    "ciphertext",
  ])) {
    throw new VaultBackupFileError("Encrypted backup manifest is invalid.");
  }
  if (
    value.manifestVersion !== VAULT_BACKUP_MANIFEST_VERSION ||
    value.algorithm !== "AES-256-GCM" ||
    value.tagBits !== 128 ||
    typeof value.nonce !== "string" ||
    typeof value.ciphertext !== "string"
  ) {
    throw new VaultBackupFileError("Encrypted backup manifest is invalid.");
  }
  let nonce: Uint8Array | undefined;
  let ciphertext: Uint8Array | undefined;
  try {
    nonce = base64UrlToBytes(value.nonce);
    ciphertext = base64UrlToBytes(value.ciphertext);
    if (nonce.byteLength !== 12 || ciphertext.byteLength < 16 || ciphertext.byteLength > 1_024) {
      throw new VaultBackupFileError("Encrypted backup manifest is invalid.");
    }
  } catch (error) {
    if (error instanceof VaultBackupFileError) throw error;
    throw new VaultBackupFileError("Encrypted backup manifest is invalid.");
  } finally {
    clearBytes(nonce, ciphertext);
  }
  return {
    manifestVersion: VAULT_BACKUP_MANIFEST_VERSION,
    algorithm: "AES-256-GCM",
    nonce: value.nonce,
    tagBits: 128,
    ciphertext: value.ciphertext,
  };
}

export function parseEncryptedVaultBackup(value: unknown): EncryptedVaultBackup {
  if (!isRecord(value) || !hasExactKeys(value, [
    "format",
    "formatVersion",
    "exportedAt",
    "profile",
    "records",
    "manifest",
  ])) {
    throw new VaultBackupFileError("Encrypted backup file is invalid.");
  }
  if (value.format !== VAULT_BACKUP_FORMAT || value.formatVersion !== VAULT_BACKUP_FORMAT_VERSION) {
    throw new VaultBackupFileError("Encrypted backup version is unsupported.");
  }
  const snapshot = parseVaultBackupSnapshot({ profile: value.profile, records: value.records });
  return {
    format: VAULT_BACKUP_FORMAT,
    formatVersion: VAULT_BACKUP_FORMAT_VERSION,
    exportedAt: parseTimestamp(value.exportedAt),
    ...snapshot,
    manifest: parseManifest(value.manifest),
  };
}

function isSuccess(value: unknown): value is { success: true; data: unknown } {
  return isRecord(value) && hasExactKeys(value, ["success", "data"]) && value.success === true;
}

async function readResponse(response: Response): Promise<unknown> {
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new VaultBackupRequestError(response.status || 500);
  }
  if (!response.ok || !isSuccess(value)) throw new VaultBackupRequestError(response.status || 500);
  return value.data;
}

export async function fetchVaultBackupSnapshot(signal?: AbortSignal): Promise<VaultBackupSnapshot> {
  const response = await fetch("/api/vault/backup", {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  try {
    return parseVaultBackupSnapshot(await readResponse(response));
  } catch (error) {
    if (error instanceof VaultBackupRequestError) throw error;
    throw new VaultBackupRequestError(response.status || 500);
  }
}

function parseRestoreResult(value: unknown): VaultBackupRestoreResult {
  if (!isRecord(value) || !hasExactKeys(value, ["profile", "counts"]) || !isRecord(value.counts)) {
    throw new VaultBackupRequestError(500);
  }
  const profile = parseVaultEncryptionProfile(value.profile);
  const counts = value.counts;
  const expectedKeys = ["vaultItems", "projects", "envBundles", "notes", "taskCategories", "tasks"];
  if (!hasExactKeys(counts, expectedKeys)) throw new VaultBackupRequestError(500);
  const parseCount = (key: string) => {
    const count = counts[key];
    if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
      throw new VaultBackupRequestError(500);
    }
    return count;
  };
  return {
    profile,
    counts: {
      vaultItems: parseCount("vaultItems"),
      projects: parseCount("projects"),
      envBundles: parseCount("envBundles"),
      notes: parseCount("notes"),
      taskCategories: parseCount("taskCategories"),
      tasks: parseCount("tasks"),
    },
  };
}

export async function persistEncryptedVaultBackup(
  backup: EncryptedVaultBackup,
  expectedProfile: VaultBackupRestoreExpectation | null,
  signal?: AbortSignal,
): Promise<VaultBackupRestoreResult> {
  const response = await fetch("/api/vault/backup", {
    method: "PUT",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ backup, expectedProfile }),
    signal,
  });
  return parseRestoreResult(await readResponse(response));
}

export async function readEncryptedVaultBackupFile(file: File): Promise<EncryptedVaultBackup> {
  if (file.size <= 0 || file.size > MAXIMUM_VAULT_BACKUP_BYTES) {
    throw new VaultBackupFileError("Encrypted backup file size is invalid.");
  }
  let value: unknown;
  let bytes: Uint8Array | undefined;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new VaultBackupFileError("Encrypted backup is not valid JSON.");
  } finally {
    clearBytes(bytes);
  }
  return parseEncryptedVaultBackup(value);
}

export function downloadEncryptedVaultBackup(backup: EncryptedVaultBackup): void {
  const serialized = JSON.stringify(backup, null, 2);
  const bytes = encodeUtf8(serialized);
  try {
    if (bytes.byteLength > MAXIMUM_VAULT_BACKUP_BYTES) {
      throw new VaultBackupFileError("Encrypted backup exceeds the supported file size.");
    }
  } finally {
    clearBytes(bytes);
  }
  const timestamp = backup.exportedAt.replace(/[-:]/gu, "").replace(".000", "");
  const url = URL.createObjectURL(new Blob([serialized], { type: "application/json" }));
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `devstash-encrypted-backup-${timestamp}.json`;
    anchor.rel = "noopener";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export function backupSummary(backup: EncryptedVaultBackup) {
  return { exportedAt: backup.exportedAt, counts: vaultBackupRecordCounts(backup.records) };
}
