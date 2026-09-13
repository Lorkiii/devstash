import assert from "node:assert/strict";
import test from "node:test";
import { buildRecordAad } from "../app/lib/vault-crypto/aad";
import { bytesToBase64Url, clearBytes, encodeUtf8 } from "../app/lib/vault-crypto/bytes";
import { decryptEnvBundle, encryptEnvBundle } from "../app/lib/vault-crypto/env-bundle";
import { decryptNote, encryptNote, prepareNoteInput } from "../app/lib/vault-crypto/note";
import { decryptProject, encryptProject } from "../app/lib/vault-crypto/project";
import { decryptTask, encryptTask } from "../app/lib/vault-crypto/task";
import { decryptTaskCategory, encryptTaskCategory } from "../app/lib/vault-crypto/task-category";
import { encryptRecordBytes, generateRawDek, importDek } from "../app/lib/vault-crypto/web-crypto";
import type {
  EnvBundleCiphertext,
  NoteCiphertext,
  ProjectCiphertext,
  TaskCiphertext,
  TaskCategoryCiphertext,
} from "../app/lib/workspace.types";

const OWNER_ID = "user_phase7";
const PROJECT_ID = "118f0d86-7b3a-4f9c-8a21-abcdefabcdef";
const OTHER_PROJECT_ID = "228f0d86-7b3a-4f9c-8a21-abcdefabcdef";
const ENV_ID = "338f0d86-7b3a-4f9c-8a21-abcdefabcdef";
const NOTE_ID = "448f0d86-7b3a-4f9c-8a21-abcdefabcdef";
const TASK_ID = "558f0d86-7b3a-4f9c-8a21-abcdefabcdef";
const CATEGORY_ID = "668f0d86-7b3a-4f9c-8a21-abcdefabcdef";
const OTHER_CATEGORY_ID = "778f0d86-7b3a-4f9c-8a21-abcdefabcdef";
const TIMESTAMP = "2026-09-11T10:00:00.000Z";

test("projects and complete environment bundles round-trip with fresh authenticated envelopes", async () => {
  const rawDek = generateRawDek();
  const dek = await importDek(rawDek);
  const projectInput = { name: "phase-seven", description: "Synthetic project only." };
  const first = await encryptProject(OWNER_ID, dek, projectInput, PROJECT_ID);
  const second = await encryptProject(OWNER_ID, dek, projectInput, PROJECT_ID);
  assert.notEqual(first.envelope.nonce, second.envelope.nonce);
  const storedProject: ProjectCiphertext = {
    ...first,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
  assert.deepEqual(await decryptProject(OWNER_ID, dek, storedProject), {
    id: PROJECT_ID,
    ...projectInput,
    updatedAt: TIMESTAMP,
  });

  const bundleInput = {
    projectId: PROJECT_ID,
    environment: "production",
    content: "PUBLIC_NAME=synthetic\nPRIVATE_VALUE=FAKE_phase7_secret\n",
  };
  const encryptedBundle = await encryptEnvBundle(OWNER_ID, dek, bundleInput, ENV_ID);
  const storedBundle: EnvBundleCiphertext = {
    ...encryptedBundle,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
  assert.deepEqual(await decryptEnvBundle(OWNER_ID, dek, storedBundle), {
    id: ENV_ID,
    ...bundleInput,
    updatedAt: TIMESTAMP,
  });
  await assert.rejects(
    () => decryptEnvBundle(OWNER_ID, dek, { ...storedBundle, projectId: OTHER_PROJECT_ID }),
    /Cryptographic authentication failed/u,
  );
  clearBytes(rawDek);
});

test("notes keep titles, bodies, tags, and optional project membership inside local encryption", async () => {
  const rawDek = generateRawDek();
  const dek = await importDek(rawDek);
  const input = prepareNoteInput({
    projectId: PROJECT_ID,
    title: "  Synthetic note  ",
    body: "Plaintext exists only in this test process.",
    tags: "phase7, local, phase7",
  });
  assert.deepEqual(input.tags, ["phase7", "local"]);
  const encrypted = await encryptNote(OWNER_ID, dek, input, NOTE_ID);
  const stored: NoteCiphertext = { ...encrypted, createdAt: TIMESTAMP, updatedAt: TIMESTAMP };
  assert.deepEqual(await decryptNote(OWNER_ID, dek, stored), {
    id: NOTE_ID,
    projectId: PROJECT_ID,
    title: "Synthetic note",
    body: input.body,
    tags: input.tags,
    updatedAt: TIMESTAMP,
  });
  await assert.rejects(
    () => decryptNote(OWNER_ID, dek, { ...stored, projectId: null }),
    /Cryptographic authentication failed/u,
  );
  clearBytes(rawDek);
});

test("workspace payload drift and UTF-8 byte overflow fail without plaintext", async () => {
  const rawDek = generateRawDek();
  const dek = await importDek(rawDek);
  const aad = buildRecordAad(OWNER_ID, NOTE_ID, "note", []);
  const plaintext = encodeUtf8(JSON.stringify({
    payloadVersion: 1,
    title: "Synthetic note",
    body: "Private test fixture.",
    tags: [],
    unexpected: "field",
  }));
  const encrypted = await encryptRecordBytes(dek, plaintext, aad);
  const stored: NoteCiphertext = {
    id: NOTE_ID,
    projectId: null,
    envelope: {
      envelopeVersion: 1,
      algorithm: "AES-256-GCM",
      nonce: bytesToBase64Url(encrypted.nonce),
      tagBits: 128,
      ciphertext: bytesToBase64Url(encrypted.ciphertext),
    },
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
  await assert.rejects(() => decryptNote(OWNER_ID, dek, stored), /Decrypted note is invalid/u);
  await assert.rejects(
    () => encryptEnvBundle(OWNER_ID, dek, {
      projectId: PROJECT_ID,
      environment: "synthetic",
      content: "🔐".repeat(40_000),
    }, ENV_ID),
    /too large/u,
  );
  clearBytes(rawDek, aad, plaintext, encrypted.nonce, encrypted.ciphertext);
});

test("task plaintext metadata must match its authenticated payload", async () => {
  const rawDek = generateRawDek();
  const dek = await importDek(rawDek);
  const input = {
    projectId: null,
    categoryId: CATEGORY_ID,
    title: "Synthetic task",
    description: "No real workspace data.",
    dueDate: "2026-10-01",
    done: false,
    sortOrder: 3,
  };
  const encrypted = await encryptTask(OWNER_ID, dek, input, TASK_ID);
  const stored: TaskCiphertext = { ...encrypted, createdAt: TIMESTAMP, updatedAt: TIMESTAMP };
  assert.deepEqual(await decryptTask(OWNER_ID, dek, stored), {
    id: TASK_ID,
    categoryId: CATEGORY_ID,
    title: input.title,
    description: input.description,
    dueDate: input.dueDate,
    done: false,
    sortOrder: 3,
    updatedAt: TIMESTAMP,
  });
  await assert.rejects(
    () => decryptTask(OWNER_ID, dek, { ...stored, done: true }),
    /Task metadata authentication failed/u,
  );
  await assert.rejects(
    () => decryptTask(OWNER_ID, dek, { ...stored, sortOrder: 4 }),
    /Task metadata authentication failed/u,
  );
  await assert.rejects(
    () => decryptTask(OWNER_ID, dek, { ...stored, categoryId: OTHER_CATEGORY_ID }),
    /Cryptographic authentication failed/u,
  );
  clearBytes(rawDek);
});

test("custom task categories round-trip locally with a curated encrypted color", async () => {
  const rawDek = generateRawDek();
  const dek = await importDek(rawDek);
  const input = { name: "Private category", colorToken: "amber" as const };
  const first = await encryptTaskCategory(OWNER_ID, dek, input, CATEGORY_ID);
  const second = await encryptTaskCategory(OWNER_ID, dek, input, CATEGORY_ID);
  assert.notEqual(first.envelope.nonce, second.envelope.nonce);
  const stored: TaskCategoryCiphertext = {
    ...first,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
  assert.deepEqual(await decryptTaskCategory(OWNER_ID, dek, stored), {
    id: CATEGORY_ID,
    ...input,
    builtIn: false,
    updatedAt: TIMESTAMP,
  });
  await assert.rejects(
    () => decryptTaskCategory("other_owner", dek, stored),
    /Cryptographic authentication failed/u,
  );
  await assert.rejects(
    () => encryptTaskCategory(OWNER_ID, dek, { name: "Unsafe", colorToken: "raw-css" as never }),
    /Category color is invalid/u,
  );
  clearBytes(rawDek);
});
