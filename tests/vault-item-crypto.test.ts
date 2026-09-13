import assert from "node:assert/strict";
import test from "node:test";
import { buildRecordAad } from "../app/lib/vault-crypto/aad";
import {
  bytesToBase64Url,
  clearBytes,
  encodeUtf8,
} from "../app/lib/vault-crypto/bytes";
import {
  decryptGenericSecret,
  encryptGenericSecret,
  prepareGenericSecretInput,
} from "../app/lib/vault-crypto/generic-secret";
import {
  encryptRecordBytes,
  generateRawDek,
  importDek,
} from "../app/lib/vault-crypto/web-crypto";
import type { VaultItemCiphertext } from "../app/lib/vault-item.types";

const OWNER_ID = "user_abc";
const RECORD_ID = "018f0d86-7b3a-4f9c-8a21-abcdefabcdef";
const OTHER_RECORD_ID = "018f0d86-7b3a-4f9c-8a21-fedcbafedcba";
const PROJECT_ID = "118f0d86-7b3a-4f9c-8a21-abcdefabcdef";
const TIMESTAMP = "2026-09-11T04:00:00.000Z";

test("generic secret form input has one canonical private payload shape", () => {
  assert.deepEqual(prepareGenericSecretInput({
    projectId: null,
    title: "  synthetic secret  ",
    value: "  preserve secret spaces  ",
    notes: "private note\n",
    tags: "infra, personal, infra",
  }), {
    projectId: null,
    title: "synthetic secret",
    value: "  preserve secret spaces  ",
    notes: "private note\n",
    tags: ["infra", "personal"],
  });
  assert.throws(() => prepareGenericSecretInput({
    projectId: null,
    title: "synthetic",
    value: "x",
    notes: "",
    tags: Array.from({ length: 21 }, (_, index) => `tag-${index}`).join(","),
  }), /Tags are invalid/u);
});

test("generic secret encrypts and decrypts locally with fresh nonces", async () => {
  const rawDek = generateRawDek();
  const dek = await importDek(rawDek);
  const input = {
    projectId: PROJECT_ID,
    title: "Synthetic webhook secret",
    value: "whsec_FAKE_phase6_value",
    notes: "Synthetic test fixture only.",
    tags: ["test", "webhook"],
  };
  const first = await encryptGenericSecret(OWNER_ID, dek, input, RECORD_ID);
  const second = await encryptGenericSecret(OWNER_ID, dek, input, RECORD_ID);
  assert.notEqual(first.envelope.nonce, second.envelope.nonce);

  const stored: VaultItemCiphertext = {
    ...first,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
  assert.deepEqual(await decryptGenericSecret(OWNER_ID, dek, stored), {
    id: RECORD_ID,
    projectId: PROJECT_ID,
    type: "GENERIC_SECRET",
    title: input.title,
    fields: [{ key: "value", label: "Secret", value: input.value, secret: true }],
    notes: input.notes,
    tags: input.tags,
    updatedAt: TIMESTAMP,
  });

  await assert.rejects(
    () => decryptGenericSecret("user_other", dek, stored),
    /Cryptographic authentication failed/u,
  );
  await assert.rejects(
    () => decryptGenericSecret(OWNER_ID, dek, { ...stored, projectId: null }),
    /Cryptographic authentication failed/u,
  );
  await assert.rejects(
    () => decryptGenericSecret(OWNER_ID, dek, { ...stored, id: OTHER_RECORD_ID }),
    /Cryptographic authentication failed/u,
  );
  clearBytes(rawDek);
});

test("decryption rejects payload drift without returning partial plaintext", async () => {
  const rawDek = generateRawDek();
  const dek = await importDek(rawDek);
  const aad = buildRecordAad(OWNER_ID, RECORD_ID, "vault-item", []);
  const plaintext = encodeUtf8(JSON.stringify({
    payloadVersion: 1,
    title: "Synthetic",
    value: "FAKE-value",
    notes: null,
    tags: [],
    unexpected: "field",
  }));
  const encrypted = await encryptRecordBytes(dek, plaintext, aad);
  const stored: VaultItemCiphertext = {
    id: RECORD_ID,
    projectId: null,
    itemType: "GENERIC_SECRET",
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
  await assert.rejects(
    () => decryptGenericSecret(OWNER_ID, dek, stored),
    /Decrypted generic secret is invalid/u,
  );
  clearBytes(rawDek, aad, plaintext, encrypted.nonce, encrypted.ciphertext);
});

test("generic secret rejects a payload that exceeds its UTF-8 byte budget", async () => {
  const rawDek = generateRawDek();
  const dek = await importDek(rawDek);
  await assert.rejects(
    () => encryptGenericSecret(OWNER_ID, dek, {
      projectId: null,
      title: "Synthetic",
      value: "🔐".repeat(16_384),
      notes: null,
      tags: [],
    }, RECORD_ID),
    /too large/u,
  );
  clearBytes(rawDek);
});
