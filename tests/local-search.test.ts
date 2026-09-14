import assert from "node:assert/strict";
import test from "node:test";
import { buildLocalSearchIndex, searchLocalIndex } from "../app/lib/local-search";
import type { VaultData } from "../app/lib/vault-data.types";

const data: VaultData = {
  secrets: [{
    id: "118f0d86-7b3a-4f9c-8a21-abcdefabcdef",
    type: "GENERIC_SECRET",
    title: "Synthetic registry",
    fields: [{ key: "value", label: "Secret", value: "FAKE_token_alpha", secret: true }],
    notes: "Only a local fixture",
    tags: ["registry"],
    updatedAt: "2026-09-13T00:00:00.000Z",
  }],
  projects: [{
    id: "228f0d86-7b3a-4f9c-8a21-abcdefabcdef",
    name: "Phase Eight",
    description: "Searchable project description",
    updatedAt: "2026-09-13T00:00:00.000Z",
  }],
  envBundles: [{
    id: "338f0d86-7b3a-4f9c-8a21-abcdefabcdef",
    projectId: "228f0d86-7b3a-4f9c-8a21-abcdefabcdef",
    environment: "testing",
    content: "PRIVATE_FAKE_VALUE=bravo",
    updatedAt: "2026-09-13T00:00:00.000Z",
  }],
  notes: [{
    id: "448f0d86-7b3a-4f9c-8a21-abcdefabcdef",
    title: "Local note",
    body: "Needle inside the private body",
    tags: ["memo"],
    updatedAt: "2026-09-13T00:00:00.000Z",
  }],
  tasks: [{
    id: "558f0d86-7b3a-4f9c-8a21-abcdefabcdef",
    title: "Finish restore tests",
    description: "Validate charlie fixture",
    done: false,
    sortOrder: 0,
    updatedAt: "2026-09-13T00:00:00.000Z",
  }],
  taskCategories: [],
};

test("local search matches decrypted fields without returning secret values", () => {
  const index = buildLocalSearchIndex(data);
  const secretMatch = searchLocalIndex(index, "FAKE_token_alpha", 10);
  assert.equal(secretMatch.length, 1);
  assert.equal(secretMatch[0].label, "Synthetic registry");
  assert.equal(JSON.stringify(secretMatch).includes("FAKE_token_alpha"), false);

  assert.equal(searchLocalIndex(index, "PRIVATE_FAKE_VALUE bravo", 10)[0]?.kind, "environment");
  assert.equal(searchLocalIndex(index, "needle private", 10)[0]?.kind, "note");
  assert.equal(searchLocalIndex(index, "charlie", 10)[0]?.kind, "task");
});

test("local search ranks title matches and respects its result bound", () => {
  const index = buildLocalSearchIndex(data);
  const results = searchLocalIndex(index, "phase", 1);
  assert.equal(results.length, 1);
  assert.equal(results[0].label, "Phase Eight");
  assert.deepEqual(searchLocalIndex(index, "", 10), []);
});
