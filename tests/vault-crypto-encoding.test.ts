import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { createCryptoId } from "../app/lib/vault-crypto/aad";
import {
  base64UrlToBytes,
  bytesToBase64Url,
  bytesToHex,
  clearBytes,
  decodeUtf8,
  encodePassphrase,
  hexToBytes,
} from "../app/lib/vault-crypto/bytes";
import {
  decodeRecoveryPhrase,
  encodeRecoveryEntropy,
  generateRecoveryPhrase,
  normalizeRecoveryPhrase,
} from "../app/lib/vault-crypto/recovery-phrase";

const ZERO_256_BIT_ENTROPY = "00".repeat(32);
const ALL_ONE_256_BIT_ENTROPY = "ff".repeat(32);
const ZERO_PHRASE = `${"abandon ".repeat(23)}art`;
const ALL_ONE_PHRASE = `${"zoo ".repeat(23)}vote`;

test("passphrase encoding applies NFC without trimming or changing capitalization", () => {
  const composed = encodePassphrase("pa\u0308ssphrase-unicode-安全");
  assert.equal(decodeUtf8(composed), "pässphrase-unicode-安全");
  assert.equal(decodeUtf8(encodePassphrase("  Spaces Stay EXACTLY  ")), "  Spaces Stay EXACTLY  ");
  clearBytes(composed);
});

test("passphrase length counts Unicode code points and rejects malformed input", () => {
  assert.equal(Array.from(decodeUtf8(encodePassphrase("🔐".repeat(128)))).length, 128);
  for (const invalid of ["a".repeat(14), "a".repeat(129), `valid-passphrase\ud800`]) {
    assert.throws(() => encodePassphrase(invalid), /Passphrase|Unicode/u);
  }
});

test("binary encodings are canonical and round-trip exact bytes", () => {
  const bytes = hexToBytes("000102fdfEFF");
  const encoded = bytesToBase64Url(bytes);
  assert.equal(encoded, "AAEC_f7_");
  assert.equal(bytesToHex(base64UrlToBytes(encoded)), "000102fdfeff");
  for (const invalid of ["A", "AA==", "+w", "/w", "AA?", "AB"]) {
    assert.throws(() => base64UrlToBytes(invalid), /Base64URL/u);
  }
});

test("the pinned English word list matches the official BIP-39 bytes", () => {
  const digest = createHash("sha256").update(`${wordlist.join("\n")}\n`).digest("hex");
  assert.equal(wordlist.length, 2_048);
  assert.equal(digest, "2f5eed53a4727b4bf8880d8f3f199efc90e58503646d9ff8eff3a2ed3b24dbda");
});

test("official 256-bit BIP-39 vectors encode and decode exactly", () => {
  for (const [entropyHex, phrase] of [
    [ZERO_256_BIT_ENTROPY, ZERO_PHRASE],
    [ALL_ONE_256_BIT_ENTROPY, ALL_ONE_PHRASE],
  ] as const) {
    const entropy = hexToBytes(entropyHex);
    assert.equal(encodeRecoveryEntropy(entropy), phrase);
    assert.equal(bytesToHex(decodeRecoveryPhrase(phrase)), entropyHex);
    clearBytes(entropy);
  }
});

test("recovery input accepts ordinary line wrapping but rejects checksum and length errors", () => {
  assert.equal(normalizeRecoveryPhrase(`  ${ZERO_PHRASE.replaceAll(" ", "\n")}  `), ZERO_PHRASE);
  assert.equal(bytesToHex(decodeRecoveryPhrase(ZERO_PHRASE.replaceAll(" ", "  "))), ZERO_256_BIT_ENTROPY);
  assert.throws(() => decodeRecoveryPhrase(`${"abandon ".repeat(23)}abandon`), /Recovery Phrase/u);
  assert.throws(() => decodeRecoveryPhrase("abandon ".repeat(11) + "about"), /Recovery Phrase/u);
});

test("generated recovery phrases always decode to 256 bits", () => {
  const phrases = new Set<string>();
  for (let index = 0; index < 8; index += 1) {
    const phrase = generateRecoveryPhrase();
    assert.equal(phrase.split(" ").length, 24);
    assert.equal(decodeRecoveryPhrase(phrase).byteLength, 32);
    phrases.add(phrase);
  }
  assert.equal(phrases.size, 8);
});

test("cryptographic IDs use canonical UUID v4", () => {
  assert.match(createCryptoId(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
});
