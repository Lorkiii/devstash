import "client-only";

import {
  VAULT_BACKUP_FORMAT,
  VAULT_BACKUP_FORMAT_VERSION,
  VAULT_BACKUP_MANIFEST_VERSION,
  type EncryptedVaultBackup,
  type VaultBackupSnapshot,
} from "../vault-backup.types";
import { buildBackupManifestAad } from "./aad";
import {
  base64UrlToBytes,
  bytesToBase64Url,
  clearBytes,
  decodeUtf8,
  encodeUtf8,
} from "./bytes";
import { AES_GCM_TAG_BITS } from "./constants";
import { VaultCryptoValidationError } from "./errors";
import { decryptRecordBytes, digestSha256, encryptRecordBytes } from "./web-crypto";

interface BackupManifestV1 {
  manifestVersion: 1;
  backupFormatVersion: 1;
  profileId: string;
  profileRevision: number;
  exportedAt: string;
  contentSha256: string;
}

function backupCore(backup: VaultBackupSnapshot & { exportedAt: string }) {
  return {
    format: VAULT_BACKUP_FORMAT,
    formatVersion: VAULT_BACKUP_FORMAT_VERSION,
    exportedAt: backup.exportedAt,
    profile: backup.profile,
    records: backup.records,
  };
}

async function contentDigest(backup: VaultBackupSnapshot & { exportedAt: string }): Promise<string> {
  const bytes = encodeUtf8(JSON.stringify(backupCore(backup)));
  try {
    return bytesToBase64Url(await digestSha256(bytes));
  } finally {
    clearBytes(bytes);
  }
}

function parseManifest(value: unknown, serialized: string): BackupManifestV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new VaultCryptoValidationError("Encrypted backup manifest is invalid.");
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const expected = [
    "backupFormatVersion",
    "contentSha256",
    "exportedAt",
    "manifestVersion",
    "profileId",
    "profileRevision",
  ];
  if (
    keys.length !== expected.length ||
    keys.some((key, index) => key !== expected[index]) ||
    record.manifestVersion !== VAULT_BACKUP_MANIFEST_VERSION ||
    record.backupFormatVersion !== VAULT_BACKUP_FORMAT_VERSION ||
    typeof record.profileId !== "string" ||
    typeof record.profileRevision !== "number" ||
    typeof record.exportedAt !== "string" ||
    typeof record.contentSha256 !== "string"
  ) {
    throw new VaultCryptoValidationError("Encrypted backup manifest is invalid.");
  }
  const manifest: BackupManifestV1 = {
    manifestVersion: VAULT_BACKUP_MANIFEST_VERSION,
    backupFormatVersion: VAULT_BACKUP_FORMAT_VERSION,
    profileId: record.profileId,
    profileRevision: record.profileRevision,
    exportedAt: record.exportedAt,
    contentSha256: record.contentSha256,
  };
  if (JSON.stringify(manifest) !== serialized) {
    throw new VaultCryptoValidationError("Encrypted backup manifest is invalid.");
  }
  return manifest;
}

export async function createEncryptedVaultBackup(
  ownerId: string,
  dek: CryptoKey,
  snapshot: VaultBackupSnapshot,
  exportedAt = new Date().toISOString(),
): Promise<EncryptedVaultBackup> {
  const manifest: BackupManifestV1 = {
    manifestVersion: VAULT_BACKUP_MANIFEST_VERSION,
    backupFormatVersion: VAULT_BACKUP_FORMAT_VERSION,
    profileId: snapshot.profile.profileId,
    profileRevision: snapshot.profile.profileRevision,
    exportedAt,
    contentSha256: await contentDigest({ ...snapshot, exportedAt }),
  };
  const plaintext = encodeUtf8(JSON.stringify(manifest));
  const aad = buildBackupManifestAad(
    ownerId,
    snapshot.profile.profileId,
    snapshot.profile.profileRevision,
    exportedAt,
  );
  try {
    const encrypted = await encryptRecordBytes(dek, plaintext, aad);
    try {
      return {
        ...backupCore({ ...snapshot, exportedAt }),
        manifest: {
          manifestVersion: VAULT_BACKUP_MANIFEST_VERSION,
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

export async function verifyEncryptedVaultBackup(
  ownerId: string,
  dek: CryptoKey,
  backup: EncryptedVaultBackup,
): Promise<void> {
  const nonce = base64UrlToBytes(backup.manifest.nonce);
  const ciphertext = base64UrlToBytes(backup.manifest.ciphertext);
  const aad = buildBackupManifestAad(
    ownerId,
    backup.profile.profileId,
    backup.profile.profileRevision,
    backup.exportedAt,
  );
  let plaintext: Uint8Array | undefined;
  try {
    plaintext = await decryptRecordBytes(dek, ciphertext, nonce, aad);
    const serialized = decodeUtf8(plaintext);
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized) as unknown;
    } catch {
      throw new VaultCryptoValidationError("Encrypted backup manifest is invalid.");
    }
    const manifest = parseManifest(parsed, serialized);
    const expectedDigest = await contentDigest(backup);
    if (
      manifest.profileId !== backup.profile.profileId ||
      manifest.profileRevision !== backup.profile.profileRevision ||
      manifest.exportedAt !== backup.exportedAt ||
      manifest.contentSha256 !== expectedDigest
    ) {
      throw new VaultCryptoValidationError("Encrypted backup integrity check failed.");
    }
  } finally {
    clearBytes(nonce, ciphertext, aad, plaintext);
  }
}
