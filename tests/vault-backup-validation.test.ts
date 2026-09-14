import assert from "node:assert/strict";
import test from "node:test";
import { encryptedVaultBackupSchema, restoreVaultBackupSchema } from "../app/lib/vault-backup/validation";

const PROFILE_ID = "018f0d86-7b3a-4f9c-8a21-123456789abc";
const PROJECT_ID = "118f0d86-7b3a-4f9c-8a21-abcdefabcdef";
const ITEM_ID = "228f0d86-7b3a-4f9c-8a21-abcdefabcdef";
const TIMESTAMP = "2026-09-13T00:00:00.000Z";
const encoded = (length: number, fill: number) => Buffer.alloc(length, fill).toString("base64url");

function profile() {
  return {
    profileId: PROFILE_ID,
    profileFormatVersion: 1,
    profileRevision: 1,
    passphraseWrapRevision: 1,
    recoveryWrapRevision: 1,
    passphraseEncoding: "utf8-nfc-v1",
    kdf: {
      algorithm: "argon2id",
      algorithmVersion: 19,
      salt: encoded(16, 1),
      memoryKiB: 19_456,
      iterations: 2,
      parallelism: 1,
      outputBytes: 32,
    },
    passphraseKeyWrap: {
      algorithm: "AES-256-GCM",
      nonce: encoded(12, 2),
      tagBits: 128,
      wrappedDek: encoded(48, 3),
    },
    recovery: {
      phraseEncoding: "bip39-english-256-v1",
      kdf: {
        algorithm: "HKDF-SHA-256",
        salt: encoded(32, 4),
        info: "devstash:recovery-wrap:v1",
        outputBytes: 32,
      },
      keyWrap: {
        algorithm: "AES-256-GCM",
        nonce: encoded(12, 5),
        tagBits: 128,
        wrappedDek: encoded(48, 6),
      },
    },
  };
}

const envelope = () => ({
  envelopeVersion: 1,
  algorithm: "AES-256-GCM",
  nonce: encoded(12, 7),
  tagBits: 128,
  ciphertext: encoded(64, 8),
});

function backup() {
  return {
    format: "devstash-encrypted-backup",
    formatVersion: 1,
    exportedAt: TIMESTAMP,
    profile: profile(),
    records: {
      vaultItems: [{
        id: ITEM_ID,
        projectId: PROJECT_ID,
        itemType: "GENERIC_SECRET",
        envelope: envelope(),
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      }],
      projects: [{ id: PROJECT_ID, envelope: envelope(), createdAt: TIMESTAMP, updatedAt: TIMESTAMP }],
      envBundles: [],
      notes: [],
      taskCategories: [],
      tasks: [],
    },
    manifest: {
      manifestVersion: 1,
      algorithm: "AES-256-GCM",
      nonce: encoded(12, 9),
      tagBits: 128,
      ciphertext: encoded(128, 10),
    },
  };
}

test("backup validation accepts only the exact ciphertext-only restore contract", () => {
  const valid = backup();
  assert.equal(encryptedVaultBackupSchema.safeParse(valid).success, true);
  assert.equal(restoreVaultBackupSchema.safeParse({ backup: valid, expectedProfile: null }).success, true);
  assert.equal(restoreVaultBackupSchema.safeParse({
    backup: valid,
    expectedProfile: { profileId: PROFILE_ID, profileRevision: 1 },
  }).success, true);
  assert.equal(restoreVaultBackupSchema.safeParse({
    backup: valid,
    expectedProfile: null,
    ownerId: "attacker",
  }).success, false);
  assert.equal(encryptedVaultBackupSchema.safeParse({ ...valid, plaintext: "not allowed" }).success, false);
});

test("backup validation rejects duplicates, orphan relationships, and timestamp drift", () => {
  const duplicate = backup();
  duplicate.records.projects.push(duplicate.records.projects[0]);
  assert.equal(encryptedVaultBackupSchema.safeParse(duplicate).success, false);

  const orphan = backup();
  orphan.records.projects = [];
  assert.equal(encryptedVaultBackupSchema.safeParse(orphan).success, false);

  const timeDrift = backup();
  timeDrift.records.vaultItems[0].createdAt = "2026-09-14T00:00:00.000Z";
  assert.equal(encryptedVaultBackupSchema.safeParse(timeDrift).success, false);
});
