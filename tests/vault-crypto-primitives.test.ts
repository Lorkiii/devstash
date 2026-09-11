import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPassphraseWrapAad,
  buildRecordAad,
  buildRecoveryWrapAad,
} from "../app/lib/vault-crypto/aad";
import {
  bytesToHex,
  clearBytes,
  decodeUtf8,
  encodeUtf8,
  hexToBytes,
} from "../app/lib/vault-crypto/bytes";
import { VaultCryptoAuthenticationError } from "../app/lib/vault-crypto/errors";
import {
  decryptAesGcm,
  decryptRecordBytes,
  deriveRecoveryWrappingKey,
  encryptAesGcm,
  encryptRecordBytes,
  generateRawDek,
  importAesGcmKey,
  importDek,
  unwrapDek,
  wrapRawDek,
} from "../app/lib/vault-crypto/web-crypto";

const OWNER_ID = "user_abc";
const PROFILE_ID = "018f0d86-7b3a-4f9c-8a21-123456789abc";
const RECORD_ID = "018f0d86-7b3a-4f9c-8a21-abcdefabcdef";

test("AAD builders serialize the exact ordered V1 arrays", () => {
  assert.equal(
    decodeUtf8(buildPassphraseWrapAad(OWNER_ID, PROFILE_ID, 1)),
    `["devstash","vault-profile","passphrase-wrap",1,"${OWNER_ID}","${PROFILE_ID}",1]`,
  );
  assert.equal(
    decodeUtf8(buildRecoveryWrapAad(OWNER_ID, PROFILE_ID, 2)),
    `["devstash","vault-profile","recovery-wrap",1,"${OWNER_ID}","${PROFILE_ID}",2]`,
  );
  assert.equal(
    decodeUtf8(buildRecordAad(OWNER_ID, RECORD_ID, "note", [PROFILE_ID])),
    `["devstash","encrypted-record",1,"${OWNER_ID}","${RECORD_ID}","note",["${PROFILE_ID}"]]`,
  );
});

test("AAD rejects invalid identity, UUID, relationship, and revision fields", () => {
  assert.throws(() => buildPassphraseWrapAad("", PROFILE_ID, 1), /Owner ID/u);
  assert.throws(() => buildPassphraseWrapAad(OWNER_ID, PROFILE_ID.toUpperCase(), 1), /UUID v4/u);
  assert.throws(() => buildRecoveryWrapAad(OWNER_ID, PROFILE_ID, 0), /revision/u);
  assert.throws(() => buildRecordAad(OWNER_ID, RECORD_ID, "note", ["not-a-uuid"]), /UUID v4/u);
});

test("Web Crypto AES-256-GCM matches the NIST zero-key vector", async () => {
  const keyBytes = new Uint8Array(32);
  const plaintext = new Uint8Array(16);
  const nonce = new Uint8Array(12);
  const key = await importAesGcmKey(keyBytes);
  const ciphertext = await encryptAesGcm(key, plaintext, nonce, new Uint8Array());
  assert.equal(
    bytesToHex(ciphertext),
    "cea7403d4d606b6e074ec5d3baf39d18d0d1c8a799996bf0265b98b5d48ab919",
  );
  assert.deepEqual(await decryptAesGcm(key, ciphertext, nonce, new Uint8Array()), plaintext);
  clearBytes(keyBytes, plaintext, nonce, ciphertext);
});

test("the recovery HKDF, DEK wrap, and record envelope match fixed V1 vectors", async () => {
  const entropy = hexToBytes("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f");
  const recoverySalt = hexToBytes("202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f");
  const rawDek = hexToBytes("404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f");
  const wrapNonce = hexToBytes("606162636465666768696a6b");
  const recordNonce = hexToBytes("707172737475767778797a7b");
  const recoveryAad = buildRecoveryWrapAad(OWNER_ID, PROFILE_ID, 1);
  const recordAad = buildRecordAad(OWNER_ID, RECORD_ID, "note", [PROFILE_ID]);

  const rwk = await deriveRecoveryWrappingKey(entropy, recoverySalt);
  const wrappedDek = await wrapRawDek(rwk, rawDek, wrapNonce, recoveryAad);
  assert.equal(
    bytesToHex(wrappedDek),
    "51efd8ae3100a958f634251cbc1f78504c6fb5486d0c79932afe091a0e63d4b0cc128fe71473e231e03c8788a292989f",
  );

  const dek = await unwrapDek(rwk, wrappedDek, wrapNonce, recoveryAad);
  await assert.rejects(() => crypto.subtle.exportKey("raw", dek), /extractable|InvalidAccess/u);
  const plaintext = encodeUtf8(JSON.stringify({ title: "synthetic" }));
  const encrypted = await encryptRecordBytes(dek, plaintext, recordAad, recordNonce);
  assert.equal(
    bytesToHex(encrypted.ciphertext),
    "a8c7cf71ea348128917dc824d1707344bc6102b36dbdc091b8d96528f90e3d1a666dbd4af0",
  );
  assert.equal(decodeUtf8(await decryptRecordBytes(dek, encrypted.ciphertext, encrypted.nonce, recordAad)), decodeUtf8(plaintext));

  clearBytes(entropy, recoverySalt, rawDek, wrapNonce, recordNonce, recoveryAad, recordAad, wrappedDek, plaintext, encrypted.nonce, encrypted.ciphertext);
});

test("AES-GCM authentication failures never return plaintext", async () => {
  const rawDek = generateRawDek();
  const dek = await importDek(rawDek);
  const nonce = hexToBytes("000102030405060708090a0b");
  const aad = buildRecordAad(OWNER_ID, RECORD_ID, "note", []);
  const plaintext = encodeUtf8("synthetic private value");
  const ciphertext = await encryptAesGcm(dek, plaintext, nonce, aad);

  const corruptedCiphertext = Uint8Array.from(ciphertext);
  corruptedCiphertext[0] ^= 1;
  const corruptedTag = Uint8Array.from(ciphertext);
  corruptedTag[corruptedTag.length - 1] ^= 1;
  const wrongNonce = Uint8Array.from(nonce);
  wrongNonce[0] ^= 1;
  const wrongOwnerAad = buildRecordAad("user_other", RECORD_ID, "note", []);
  const wrongIdAad = buildRecordAad(
    OWNER_ID,
    "018f0d86-7b3a-4f9c-8a21-fedcbafedcba",
    "note",
    [],
  );
  const wrongTypeAad = buildRecordAad(OWNER_ID, RECORD_ID, "task", []);
  const wrongVersionAad = encodeUtf8(
    JSON.stringify(["devstash", "encrypted-record", 2, OWNER_ID, RECORD_ID, "note", []]),
  );
  const cases = [
    [corruptedCiphertext, nonce, aad],
    [corruptedTag, nonce, aad],
    [ciphertext, wrongNonce, aad],
    [ciphertext, nonce, wrongOwnerAad],
    [ciphertext, nonce, wrongIdAad],
    [ciphertext, nonce, wrongTypeAad],
    [ciphertext, nonce, wrongVersionAad],
  ] as const;
  for (const [candidate, candidateNonce, candidateAad] of cases) {
    await assert.rejects(
      () => decryptAesGcm(dek, candidate, candidateNonce, candidateAad),
      (error) => error instanceof VaultCryptoAuthenticationError,
    );
  }
  await assert.rejects(
    () => decryptRecordBytes(dek, new Uint8Array(15), nonce, aad),
    /too short/u,
  );
  await assert.rejects(
    () => decryptAesGcm(dek, ciphertext, new Uint8Array(11), aad),
    /12 bytes/u,
  );

  clearBytes(
    rawDek,
    nonce,
    aad,
    plaintext,
    ciphertext,
    corruptedCiphertext,
    corruptedTag,
    wrongNonce,
    wrongOwnerAad,
    wrongIdAad,
    wrongTypeAad,
    wrongVersionAad,
  );
});

test("generated record nonces do not repeat within a synthetic sample", async () => {
  const rawDek = generateRawDek();
  const dek = await importDek(rawDek);
  const aad = buildRecordAad(OWNER_ID, RECORD_ID, "vault-item", []);
  const nonces = new Set<string>();
  for (let index = 0; index < 128; index += 1) {
    const encrypted = await encryptRecordBytes(dek, encodeUtf8(`synthetic-${index}`), aad);
    nonces.add(bytesToHex(encrypted.nonce));
    clearBytes(encrypted.nonce, encrypted.ciphertext);
  }
  assert.equal(nonces.size, 128);
  clearBytes(rawDek, aad);
});
