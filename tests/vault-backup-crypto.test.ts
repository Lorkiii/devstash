import assert from "node:assert/strict";
import test from "node:test";
import { createEncryptedVaultBackup, verifyEncryptedVaultBackup } from "../app/lib/vault-crypto/backup";
import { clearBytes } from "../app/lib/vault-crypto/bytes";
import { encryptEnvBundle } from "../app/lib/vault-crypto/env-bundle";
import { encryptGenericSecret } from "../app/lib/vault-crypto/generic-secret";
import { encryptNote } from "../app/lib/vault-crypto/note";
import { encryptProject } from "../app/lib/vault-crypto/project";
import { encryptTask } from "../app/lib/vault-crypto/task";
import { encryptTaskCategory } from "../app/lib/vault-crypto/task-category";
import { generateRawDek, importDek } from "../app/lib/vault-crypto/web-crypto";
import { decryptVaultSnapshot } from "../app/lib/vault-snapshot";
import type { VaultBackupSnapshot } from "../app/lib/vault-backup.types";
import type { VaultEncryptionProfile } from "../app/lib/vault-profile.types";
import { parseEncryptedVaultBackup } from "../app/lib/vault-backup-client";

const OWNER_ID = "phase8_user";
const PROFILE_ID = "018f0d86-7b3a-4f9c-8a21-123456789abc";
const PROJECT_ID = "118f0d86-7b3a-4f9c-8a21-abcdefabcdef";
const ITEM_ID = "228f0d86-7b3a-4f9c-8a21-abcdefabcdef";
const ENV_ID = "338f0d86-7b3a-4f9c-8a21-abcdefabcdef";
const NOTE_ID = "448f0d86-7b3a-4f9c-8a21-abcdefabcdef";
const CATEGORY_ID = "558f0d86-7b3a-4f9c-8a21-abcdefabcdef";
const TASK_ID = "668f0d86-7b3a-4f9c-8a21-abcdefabcdef";
const TIMESTAMP = "2026-09-13T00:00:00.000Z";
const encoded = (length: number, fill: number) => Buffer.alloc(length, fill).toString("base64url");

const profile: VaultEncryptionProfile = {
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

test("encrypted backup manifest covers a complete locally decryptable restore", async () => {
  const rawDek = generateRawDek();
  const dek = await importDek(rawDek);
  try {
    const [project, item, envBundle, note, taskCategory, task] = await Promise.all([
      encryptProject(OWNER_ID, dek, { name: "Synthetic project", description: "Phase 8 fixture" }, PROJECT_ID),
      encryptGenericSecret(OWNER_ID, dek, {
        projectId: PROJECT_ID,
        title: "Synthetic secret",
        value: "FAKE_phase8_value",
        notes: null,
        tags: ["backup"],
      }, ITEM_ID),
      encryptEnvBundle(OWNER_ID, dek, {
        projectId: PROJECT_ID,
        environment: "test",
        content: "FAKE_PHASE8=value\n",
      }, ENV_ID),
      encryptNote(OWNER_ID, dek, {
        projectId: PROJECT_ID,
        title: "Synthetic note",
        body: "Only test data",
        tags: [],
      }, NOTE_ID),
      encryptTaskCategory(OWNER_ID, dek, { name: "Synthetic category", colorToken: "cyan" }, CATEGORY_ID),
      encryptTask(OWNER_ID, dek, {
        projectId: PROJECT_ID,
        categoryId: CATEGORY_ID,
        title: "Synthetic task",
        description: null,
        dueDate: null,
        done: false,
        sortOrder: 0,
      }, TASK_ID),
    ]);
    const stored = <T extends object>(record: T) => ({ ...record, createdAt: TIMESTAMP, updatedAt: TIMESTAMP });
    const snapshot: VaultBackupSnapshot = {
      profile,
      records: {
        vaultItems: [stored(item)],
        projects: [stored(project)],
        envBundles: [stored(envBundle)],
        notes: [stored(note)],
        taskCategories: [stored(taskCategory)],
        tasks: [stored(task)],
      },
    };
    const first = await createEncryptedVaultBackup(OWNER_ID, dek, snapshot, TIMESTAMP);
    const second = await createEncryptedVaultBackup(OWNER_ID, dek, snapshot, TIMESTAMP);
    assert.notEqual(first.manifest.nonce, second.manifest.nonce);
    assert.equal(JSON.stringify(first).includes("FAKE_phase8_value"), false);
    assert.equal(JSON.stringify(first).includes("Synthetic project"), false);
    assert.deepEqual(parseEncryptedVaultBackup(structuredClone(first)), first);
    await verifyEncryptedVaultBackup(OWNER_ID, dek, first);
    const restored = await decryptVaultSnapshot(OWNER_ID, dek, first.records);
    assert.equal(restored.secrets[0].fields[0].value, "FAKE_phase8_value");
    assert.equal(restored.envBundles[0].content, "FAKE_PHASE8=value\n");
    assert.equal(restored.tasks[0].categoryId, CATEGORY_ID);

    const tampered = structuredClone(first);
    tampered.records.notes = [];
    await assert.rejects(
      () => verifyEncryptedVaultBackup(OWNER_ID, dek, tampered),
      /integrity check failed/u,
    );
    await assert.rejects(
      () => verifyEncryptedVaultBackup("other_user", dek, first),
      /authentication failed/u,
    );
  } finally {
    clearBytes(rawDek);
  }
});
