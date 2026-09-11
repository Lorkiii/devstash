import "client-only";

import {
  ARGON2ID_BENCHMARK_CANDIDATE,
  ARGON2ID_SALT_BYTES,
  type Argon2idParameters,
} from "./constants";
import { createCryptoId } from "./aad";
import { assertByteLength, clearBytes, encodePassphrase, randomBytes, toArrayBuffer } from "./bytes";
import {
  VaultCryptoAuthenticationError,
  VaultCryptoUnavailableError,
  VaultCryptoValidationError,
} from "./errors";
import type {
  VaultEncryptionProfile,
  VaultLifecycleDraft,
  VaultRecoveryRotationDraft,
  VaultSetupDraft,
} from "../vault-profile.types";
import type { VaultCryptoWorkerRequest, VaultCryptoWorkerResponse } from "./worker.types";

interface WorkerRunOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  workerFactory?: () => Worker;
}

export interface Argon2idBenchmarkOptions extends WorkerRunOptions {
  parameters?: Argon2idParameters;
  salt?: Uint8Array;
}

function createVaultCryptoWorker(): Worker {
  return new Worker(new URL("./vault-crypto.worker.ts", import.meta.url), {
    type: "module",
    name: "devstash-vault-crypto",
  });
}

function workerFailure(code: string): Error {
  if (code === "AUTHENTICATION_FAILED") return new VaultCryptoAuthenticationError();
  if (code === "INVALID_REQUEST") return new VaultCryptoValidationError("Vault request is invalid.");
  return new VaultCryptoUnavailableError();
}

async function runWorker(
  request: VaultCryptoWorkerRequest,
  transfer: ArrayBuffer[],
  options: WorkerRunOptions,
): Promise<VaultCryptoWorkerResponse> {
  const timeoutMs = options.timeoutMs ?? 120_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new VaultCryptoValidationError("Worker timeout must be a positive integer.");
  }

  const worker = (options.workerFactory ?? createVaultCryptoWorker)();
  return new Promise<VaultCryptoWorkerResponse>((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
      worker.terminate();
      callback();
    };
    const abort = () => finish(() => reject(new DOMException("Operation aborted.", "AbortError")));
    const timeout = setTimeout(
      () => finish(() => reject(new VaultCryptoUnavailableError())),
      timeoutMs,
    );

    worker.addEventListener("message", (event: MessageEvent<VaultCryptoWorkerResponse>) => {
      const response = event.data;
      if (!response || response.id !== request.id) return;
      if (response.ok) finish(() => resolve(response));
      else finish(() => reject(workerFailure(response.code)));
    });
    worker.addEventListener("error", () => {
      finish(() => reject(new VaultCryptoUnavailableError()));
    });
    options.signal?.addEventListener("abort", abort, { once: true });

    if (options.signal?.aborted) {
      abort();
      return;
    }
    worker.postMessage(request, transfer);
  });
}

export async function benchmarkArgon2idInWorker(
  syntheticPassphrase: string,
  options: Argon2idBenchmarkOptions = {},
): Promise<number> {
  const passphraseBytes = encodePassphrase(syntheticPassphrase);
  const salt = options.salt ? Uint8Array.from(options.salt) : randomBytes(ARGON2ID_SALT_BYTES);
  assertByteLength(salt, ARGON2ID_SALT_BYTES, "Argon2id salt");
  const request = {
    id: crypto.randomUUID(),
    kind: "benchmark-argon2id",
    passphraseBytes: toArrayBuffer(passphraseBytes),
    salt: toArrayBuffer(salt),
    parameters: options.parameters ?? ARGON2ID_BENCHMARK_CANDIDATE,
  } satisfies VaultCryptoWorkerRequest;
  try {
    const response = await runWorker(request, [request.passphraseBytes, request.salt], options);
    if (!response.ok || response.kind !== "benchmark-argon2id") {
      throw new VaultCryptoUnavailableError();
    }
    return response.durationMs;
  } finally {
    clearBytes(passphraseBytes, salt);
  }
}

export async function setupVaultInWorker(
  ownerId: string,
  passphrase: string,
  options: WorkerRunOptions = {},
): Promise<VaultSetupDraft> {
  const passphraseBytes = encodePassphrase(passphrase);
  const request = {
    id: crypto.randomUUID(),
    kind: "setup-vault",
    ownerId,
    profileId: createCryptoId(),
    passphraseBytes: toArrayBuffer(passphraseBytes),
  } satisfies VaultCryptoWorkerRequest;
  try {
    const response = await runWorker(request, [request.passphraseBytes], options);
    if (!response.ok || response.kind !== "setup-vault") throw new VaultCryptoUnavailableError();
    return response.result;
  } finally {
    clearBytes(passphraseBytes);
  }
}

export async function unlockVaultInWorker(
  ownerId: string,
  profile: VaultEncryptionProfile,
  passphrase: string,
  options: WorkerRunOptions = {},
): Promise<VaultLifecycleDraft> {
  const passphraseBytes = encodePassphrase(passphrase);
  const request = {
    id: crypto.randomUUID(),
    kind: "unlock-vault",
    ownerId,
    profile,
    passphraseBytes: toArrayBuffer(passphraseBytes),
  } satisfies VaultCryptoWorkerRequest;
  try {
    const response = await runWorker(request, [request.passphraseBytes], options);
    if (!response.ok || response.kind !== "unlock-vault") throw new VaultCryptoUnavailableError();
    return response.result;
  } finally {
    clearBytes(passphraseBytes);
  }
}

export async function changePassphraseInWorker(
  ownerId: string,
  profile: VaultEncryptionProfile,
  currentPassphrase: string,
  newPassphrase: string,
  options: WorkerRunOptions = {},
): Promise<VaultLifecycleDraft> {
  const currentPassphraseBytes = encodePassphrase(currentPassphrase);
  const newPassphraseBytes = encodePassphrase(newPassphrase);
  const request = {
    id: crypto.randomUUID(),
    kind: "change-passphrase",
    ownerId,
    profile,
    currentPassphraseBytes: toArrayBuffer(currentPassphraseBytes),
    newPassphraseBytes: toArrayBuffer(newPassphraseBytes),
  } satisfies VaultCryptoWorkerRequest;
  try {
    const response = await runWorker(
      request,
      [request.currentPassphraseBytes, request.newPassphraseBytes],
      options,
    );
    if (!response.ok || response.kind !== "change-passphrase") {
      throw new VaultCryptoUnavailableError();
    }
    return response.result;
  } finally {
    clearBytes(currentPassphraseBytes, newPassphraseBytes);
  }
}

export async function recoverVaultInWorker(
  ownerId: string,
  profile: VaultEncryptionProfile,
  recoveryPhrase: string,
  newPassphrase: string,
  options: WorkerRunOptions = {},
): Promise<VaultLifecycleDraft> {
  const newPassphraseBytes = encodePassphrase(newPassphrase);
  const request = {
    id: crypto.randomUUID(),
    kind: "recover-vault",
    ownerId,
    profile,
    recoveryPhrase,
    newPassphraseBytes: toArrayBuffer(newPassphraseBytes),
  } satisfies VaultCryptoWorkerRequest;
  try {
    const response = await runWorker(request, [request.newPassphraseBytes], options);
    if (!response.ok || response.kind !== "recover-vault") throw new VaultCryptoUnavailableError();
    return response.result;
  } finally {
    clearBytes(newPassphraseBytes);
  }
}

export async function rotateRecoveryPhraseInWorker(
  ownerId: string,
  profile: VaultEncryptionProfile,
  currentPassphrase: string,
  options: WorkerRunOptions = {},
): Promise<VaultRecoveryRotationDraft> {
  const currentPassphraseBytes = encodePassphrase(currentPassphrase);
  const request = {
    id: crypto.randomUUID(),
    kind: "rotate-recovery",
    ownerId,
    profile,
    currentPassphraseBytes: toArrayBuffer(currentPassphraseBytes),
  } satisfies VaultCryptoWorkerRequest;
  try {
    const response = await runWorker(request, [request.currentPassphraseBytes], options);
    if (!response.ok || response.kind !== "rotate-recovery") {
      throw new VaultCryptoUnavailableError();
    }
    return response.result;
  } finally {
    clearBytes(currentPassphraseBytes);
  }
}
