import assert from "node:assert/strict";
import test from "node:test";
import {
  createVaultProfileSchema,
  updateVaultProfileSchema,
} from "../app/lib/vault-profile/validation";

function encoded(length: number, fill: number): string {
  return Buffer.alloc(length, fill).toString("base64url");
}

function validProfile() {
  return {
    profileId: "018f0d86-7b3a-4f9c-8a21-123456789abc",
    profileFormatVersion: 1,
    profileRevision: 1,
    passphraseWrapRevision: 1,
    recoveryWrapRevision: 1,
    passphraseEncoding: "utf8-nfc-v1",
    kdf: {
      algorithm: "argon2id",
      algorithmVersion: 19,
      salt: encoded(16, 1),
      memoryKiB: 65_536,
      iterations: 3,
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

test("profile setup accepts only the exact ciphertext metadata contract", () => {
  assert.equal(createVaultProfileSchema.safeParse({ profile: validProfile() }).success, true);

  const withOwner = { profile: { ...validProfile(), ownerId: "attacker-selected" } };
  assert.equal(createVaultProfileSchema.safeParse(withOwner).success, false);

  const shortNonce = validProfile();
  shortNonce.passphraseKeyWrap.nonce = encoded(11, 2);
  assert.equal(createVaultProfileSchema.safeParse({ profile: shortNonce }).success, false);

  const weakKdf = validProfile();
  weakKdf.kdf.memoryKiB = 19_455;
  assert.equal(createVaultProfileSchema.safeParse({ profile: weakKdf }).success, false);
});

test("profile updates require bounded compare-and-swap revisions and reject extra fields", () => {
  const profile = validProfile();
  const update = {
    action: "replace-passphrase",
    expectedProfileRevision: 1,
    expectedPassphraseWrapRevision: 1,
    kdf: profile.kdf,
    passphraseKeyWrap: profile.passphraseKeyWrap,
  };
  assert.equal(updateVaultProfileSchema.safeParse(update).success, true);
  assert.equal(updateVaultProfileSchema.safeParse({ ...update, ownerId: "other" }).success, false);
  assert.equal(updateVaultProfileSchema.safeParse({ ...update, expectedProfileRevision: 0 }).success, false);
});
