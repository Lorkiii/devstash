import assert from "node:assert/strict";
import test from "node:test";
import {
  createEnvBundleSchema,
  createNoteSchema,
  createProjectSchema,
  createTaskSchema,
  createTaskCategorySchema,
  replaceTaskSchema,
  workspaceIdSchema,
} from "../app/lib/workspace/validation";

const ID = "118f0d86-7b3a-4f9c-8a21-abcdefabcdef";
const PROJECT_ID = "228f0d86-7b3a-4f9c-8a21-abcdefabcdef";
const BUILT_IN_CATEGORY_ID = "10000000-0000-4000-8000-000000000001";

const envelope = (length = 128) => ({
  envelopeVersion: 1,
  algorithm: "AES-256-GCM",
  nonce: Buffer.alloc(12, 1).toString("base64url"),
  tagBits: 128,
  ciphertext: Buffer.alloc(length, 2).toString("base64url"),
});

test("workspace creation schemas accept only exact ciphertext contracts", () => {
  assert.equal(createProjectSchema.safeParse({ project: { id: ID, envelope: envelope() } }).success, true);
  assert.equal(createEnvBundleSchema.safeParse({
    bundle: { id: ID, projectId: PROJECT_ID, envelope: envelope() },
  }).success, true);
  assert.equal(createNoteSchema.safeParse({
    note: { id: ID, projectId: null, envelope: envelope() },
  }).success, true);
  assert.equal(createTaskSchema.safeParse({
    task: { id: ID, projectId: PROJECT_ID, categoryId: null, done: false, sortOrder: 4, envelope: envelope() },
  }).success, true);
  assert.equal(createTaskCategorySchema.safeParse({
    category: { id: ID, envelope: envelope() },
  }).success, true);
  assert.equal(createTaskCategorySchema.safeParse({
    category: { id: BUILT_IN_CATEGORY_ID, envelope: envelope() },
  }).success, false);

  assert.equal(createProjectSchema.safeParse({
    project: { id: ID, ownerId: "attacker", envelope: envelope() },
  }).success, false);
  assert.equal(createTaskSchema.safeParse({
    task: { id: ID, projectId: "other-owner", categoryId: null, done: false, sortOrder: 4, envelope: envelope() },
  }).success, false);
});

test("workspace schemas reject oversized records and route/body ID drift", () => {
  assert.equal(createEnvBundleSchema.safeParse({
    bundle: { id: ID, projectId: PROJECT_ID, envelope: envelope(131_089) },
  }).success, false);
  assert.equal(createTaskSchema.safeParse({
    task: { id: ID, projectId: null, categoryId: null, done: false, sortOrder: 1_000_001, envelope: envelope() },
  }).success, false);
  assert.equal(replaceTaskSchema.safeParse({
    task: { id: ID, projectId: null, categoryId: null, done: false, sortOrder: 1, envelope: envelope() },
  }).success, false);
  assert.equal(createTaskSchema.safeParse({
    task: { id: ID, projectId: null, categoryId: "work", done: false, sortOrder: 1, envelope: envelope() },
  }).success, false);
  assert.equal(workspaceIdSchema.safeParse("../../other-user").success, false);
});
