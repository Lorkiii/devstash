/// <reference lib="webworker" />

import { clearBytes } from "./bytes";
import { deriveArgon2idKeyBytes } from "./argon2id";
import {
  changeVaultPassphrase,
  createRecoveryRotationDraft,
  createVaultSetupDraft,
  recoverVaultAndReplacePassphrase,
  unlockVaultWithPassphrase,
} from "./operations";
import { VaultCryptoUnavailableError } from "./errors";
import type { VaultCryptoWorkerRequest, VaultCryptoWorkerResponse } from "./worker.types";

const workerScope = self as DedicatedWorkerGlobalScope;

function respond(response: VaultCryptoWorkerResponse): void {
  workerScope.postMessage(response);
}

function requestBuffer(value: unknown): Uint8Array {
  if (!(value instanceof ArrayBuffer)) throw new TypeError("Invalid worker buffer.");
  return new Uint8Array(value);
}

workerScope.addEventListener("message", async (event: MessageEvent<VaultCryptoWorkerRequest>) => {
  const request = event.data;
  if (!request || typeof request.id !== "string") {
    respond({ id: "invalid", ok: false, code: "INVALID_REQUEST" });
    workerScope.close();
    return;
  }

  const requestId = request.id;
  const sensitiveBuffers: Uint8Array[] = [];
  try {
    switch (request.kind) {
      case "benchmark-argon2id": {
        const passphraseBytes = requestBuffer(request.passphraseBytes);
        const salt = requestBuffer(request.salt);
        sensitiveBuffers.push(passphraseBytes, salt);
        const startedAt = performance.now();
        const derivedKey = await deriveArgon2idKeyBytes(passphraseBytes, salt, request.parameters);
        sensitiveBuffers.push(derivedKey);
        respond({
          id: request.id,
          ok: true,
          kind: request.kind,
          durationMs: performance.now() - startedAt,
        });
        break;
      }
      case "setup-vault": {
        const passphraseBytes = requestBuffer(request.passphraseBytes);
        sensitiveBuffers.push(passphraseBytes);
        const result = await createVaultSetupDraft(
          request.ownerId,
          request.profileId,
          passphraseBytes,
        );
        respond({ id: request.id, ok: true, kind: request.kind, result });
        break;
      }
      case "unlock-vault": {
        const passphraseBytes = requestBuffer(request.passphraseBytes);
        sensitiveBuffers.push(passphraseBytes);
        const result = await unlockVaultWithPassphrase(
          request.ownerId,
          request.profile,
          passphraseBytes,
        );
        respond({ id: request.id, ok: true, kind: request.kind, result });
        break;
      }
      case "change-passphrase": {
        const currentPassphraseBytes = requestBuffer(request.currentPassphraseBytes);
        const newPassphraseBytes = requestBuffer(request.newPassphraseBytes);
        sensitiveBuffers.push(currentPassphraseBytes, newPassphraseBytes);
        const result = await changeVaultPassphrase(
          request.ownerId,
          request.profile,
          currentPassphraseBytes,
          newPassphraseBytes,
        );
        respond({ id: request.id, ok: true, kind: request.kind, result });
        break;
      }
      case "recover-vault": {
        const newPassphraseBytes = requestBuffer(request.newPassphraseBytes);
        sensitiveBuffers.push(newPassphraseBytes);
        const result = await recoverVaultAndReplacePassphrase(
          request.ownerId,
          request.profile,
          request.recoveryPhrase,
          newPassphraseBytes,
        );
        respond({ id: request.id, ok: true, kind: request.kind, result });
        break;
      }
      case "rotate-recovery": {
        const currentPassphraseBytes = requestBuffer(request.currentPassphraseBytes);
        sensitiveBuffers.push(currentPassphraseBytes);
        const result = await createRecoveryRotationDraft(
          request.ownerId,
          request.profile,
          currentPassphraseBytes,
        );
        respond({ id: request.id, ok: true, kind: request.kind, result });
        break;
      }
      default:
        respond({ id: requestId, ok: false, code: "INVALID_REQUEST" });
    }
  } catch (error) {
    respond({
      id: request.id,
      ok: false,
      code: error instanceof VaultCryptoUnavailableError
        ? "CRYPTO_UNAVAILABLE"
        : request.kind === "setup-vault" || request.kind === "benchmark-argon2id"
          ? "INVALID_REQUEST"
          : "AUTHENTICATION_FAILED",
    });
  } finally {
    clearBytes(...sensitiveBuffers);
    workerScope.close();
  }
});
