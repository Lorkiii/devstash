export class VaultCryptoValidationError extends Error {
  override readonly name = "VaultCryptoValidationError";
}

export class VaultCryptoAuthenticationError extends Error {
  override readonly name = "VaultCryptoAuthenticationError";

  constructor() {
    super("Cryptographic authentication failed.");
  }
}

export class VaultCryptoUnavailableError extends Error {
  override readonly name = "VaultCryptoUnavailableError";

  constructor() {
    super("Required browser cryptography is unavailable.");
  }
}
