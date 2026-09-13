import assert from "node:assert/strict";
import test from "node:test";
import {
  createVaultItemSchema,
  replaceVaultItemSchema,
  vaultItemIdSchema,
} from "../app/lib/vault-items/validation";

function encoded(length: number, fill: number): string {
  return Buffer.alloc(length, fill).toString("base64url");
}

function validItem() {
  return {
    id: "018f0d86-7b3a-4f9c-8a21-abcdefabcdef",
    projectId: null,
    itemType: "GENERIC_SECRET",
    envelope: {
      envelopeVersion: 1,
      algorithm: "AES-256-GCM",
      nonce: encoded(12, 1),
      tagBits: 128,
      ciphertext: encoded(128, 2),
    },
  };
}

test("vault item creation accepts only the exact ciphertext contract", () => {
  assert.equal(createVaultItemSchema.safeParse({ item: validItem() }).success, true);
  assert.equal(createVaultItemSchema.safeParse({
    item: { ...validItem(), ownerId: "attacker-selected" },
  }).success, false);
  assert.equal(createVaultItemSchema.safeParse({
    item: { ...validItem(), itemType: "LOGIN" },
  }).success, false);
  assert.equal(createVaultItemSchema.safeParse({
    item: { ...validItem(), projectId: "other-owner" },
  }).success, false);

  const shortNonce = validItem();
  shortNonce.envelope.nonce = encoded(11, 1);
  assert.equal(createVaultItemSchema.safeParse({ item: shortNonce }).success, false);

  const oversized = validItem();
  oversized.envelope.ciphertext = encoded(32_785, 2);
  assert.equal(createVaultItemSchema.safeParse({ item: oversized }).success, false);
});

test("vault item replacement takes its ID only from the validated route path", () => {
  const item = validItem();
  const replacement = { projectId: item.projectId, itemType: item.itemType, envelope: item.envelope };
  assert.equal(replaceVaultItemSchema.safeParse({ item: replacement }).success, true);
  assert.equal(replaceVaultItemSchema.safeParse({ item: validItem() }).success, false);
  assert.equal(vaultItemIdSchema.safeParse(validItem().id).success, true);
  assert.equal(vaultItemIdSchema.safeParse("../../other-user").success, false);
});
