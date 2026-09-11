import "client-only";

import { entropyToMnemonic, mnemonicToEntropy } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { RECOVERY_ENTROPY_BYTES } from "./constants";
import { assertByteLength, clearBytes, randomBytes } from "./bytes";
import { VaultCryptoValidationError } from "./errors";

export const RECOVERY_PHRASE_WORD_COUNT = 24 as const;

// BIP-39 requires NFKD text and U+0020 word separators. Accepting equivalent
// whitespace makes a saved phrase recoverable after ordinary line wrapping.
export function normalizeRecoveryPhrase(phrase: string): string {
  if (typeof phrase !== "string") {
    throw new VaultCryptoValidationError("Recovery Phrase is invalid.");
  }
  return phrase.normalize("NFKD").trim().split(/\s+/u).join(" ");
}

export function encodeRecoveryEntropy(entropy: Uint8Array): string {
  assertByteLength(entropy, RECOVERY_ENTROPY_BYTES, "Recovery entropy");
  const phrase = entropyToMnemonic(entropy, wordlist);
  if (phrase.split(" ").length !== RECOVERY_PHRASE_WORD_COUNT) {
    throw new VaultCryptoValidationError("Recovery Phrase is invalid.");
  }
  return phrase;
}

export function decodeRecoveryPhrase(phrase: string): Uint8Array {
  const normalized = normalizeRecoveryPhrase(phrase);
  if (normalized.split(" ").length !== RECOVERY_PHRASE_WORD_COUNT) {
    throw new VaultCryptoValidationError("Recovery Phrase is invalid.");
  }

  try {
    const entropy = mnemonicToEntropy(normalized, wordlist);
    assertByteLength(entropy, RECOVERY_ENTROPY_BYTES, "Recovery entropy");
    return Uint8Array.from(entropy);
  } catch {
    throw new VaultCryptoValidationError("Recovery Phrase is invalid.");
  }
}

export function generateRecoveryPhrase(): string {
  const entropy = randomBytes(RECOVERY_ENTROPY_BYTES);
  try {
    return encodeRecoveryEntropy(entropy);
  } finally {
    clearBytes(entropy);
  }
}
