import "client-only";

import type sodiumType from "libsodium-wrappers-sumo";
import {
  ARGON2ID_OUTPUT_BYTES,
  ARGON2ID_PARAMETER_BOUNDS,
  ARGON2ID_SALT_BYTES,
  type Argon2idParameters,
} from "./constants";
import { assertByteLength } from "./bytes";
import { VaultCryptoUnavailableError, VaultCryptoValidationError } from "./errors";

type Sodium = typeof sodiumType;

let sodiumPromise: Promise<Sodium> | undefined;

async function loadSodium(): Promise<Sodium> {
  sodiumPromise ??= import("libsodium-wrappers-sumo").then(async ({ default: sodium }) => {
    await sodium.ready;
    if (
      sodium.crypto_pwhash_ALG_ARGON2ID13 === undefined ||
      sodium.crypto_pwhash_SALTBYTES !== ARGON2ID_SALT_BYTES
    ) {
      throw new VaultCryptoUnavailableError();
    }
    return sodium;
  });
  return sodiumPromise;
}

function assertBoundedInteger(
  value: number,
  bounds: { readonly min: number; readonly max: number },
  label: string,
): void {
  if (!Number.isSafeInteger(value) || value < bounds.min || value > bounds.max) {
    throw new VaultCryptoValidationError(`${label} is outside the supported bounds.`);
  }
}

export function assertArgon2idParameters(parameters: Argon2idParameters): void {
  if (parameters.algorithm !== "argon2id" || parameters.algorithmVersion !== 19) {
    throw new VaultCryptoValidationError("Argon2id algorithm or version is unsupported.");
  }
  assertBoundedInteger(parameters.memoryKiB, ARGON2ID_PARAMETER_BOUNDS.memoryKiB, "Argon2id memory");
  assertBoundedInteger(parameters.iterations, ARGON2ID_PARAMETER_BOUNDS.iterations, "Argon2id iterations");
  assertBoundedInteger(parameters.parallelism, ARGON2ID_PARAMETER_BOUNDS.parallelism, "Argon2id parallelism");
  assertBoundedInteger(parameters.outputBytes, ARGON2ID_PARAMETER_BOUNDS.outputBytes, "Argon2id output length");
}

// This raw-byte primitive belongs inside the short-lived vault worker. UI and
// transport code must use the worker client and must never receive its result.
export async function deriveArgon2idKeyBytes(
  passphraseBytes: Uint8Array,
  salt: Uint8Array,
  parameters: Argon2idParameters,
): Promise<Uint8Array> {
  assertArgon2idParameters(parameters);
  assertByteLength(salt, ARGON2ID_SALT_BYTES, "Argon2id salt");
  if (!(passphraseBytes instanceof Uint8Array) || passphraseBytes.byteLength === 0) {
    throw new VaultCryptoValidationError("Passphrase bytes cannot be empty.");
  }

  const sodium = await loadSodium();
  try {
    return sodium.crypto_pwhash(
      ARGON2ID_OUTPUT_BYTES,
      passphraseBytes,
      salt,
      parameters.iterations,
      parameters.memoryKiB * 1024,
      sodium.crypto_pwhash_ALG_ARGON2ID13,
    );
  } catch {
    throw new VaultCryptoUnavailableError();
  }
}
