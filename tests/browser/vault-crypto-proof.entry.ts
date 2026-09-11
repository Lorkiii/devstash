import { buildRecordAad, buildRecoveryWrapAad } from "../../app/lib/vault-crypto/aad";
import { bytesToHex, clearBytes, encodeUtf8, hexToBytes } from "../../app/lib/vault-crypto/bytes";
import { decodeRecoveryPhrase, encodeRecoveryEntropy } from "../../app/lib/vault-crypto/recovery-phrase";
import {
  decryptRecordBytes,
  deriveRecoveryWrappingKey,
  encryptRecordBytes,
  unwrapDek,
  wrapRawDek,
} from "../../app/lib/vault-crypto/web-crypto";
import {
  benchmarkArgon2idInWorker,
  changePassphraseInWorker,
  recoverVaultInWorker,
  rotateRecoveryPhraseInWorker,
  setupVaultInWorker,
  unlockVaultInWorker,
} from "../../app/lib/vault-crypto/worker-client";

interface BrowserProofResult {
  ok: boolean;
  argon2idDurationMs?: number;
  lifecycleOperations?: number;
  cspViolationCount: number;
  userAgent: string;
  error?: string;
}

declare global {
  interface Window {
    __DEVSTASH_VAULT_CRYPTO_PROOF__?: BrowserProofResult;
  }
}

const cspViolations: SecurityPolicyViolationEvent[] = [];
window.addEventListener("securitypolicyviolation", (event) => cspViolations.push(event));

async function publish(result: Omit<BrowserProofResult, "userAgent">): Promise<void> {
  const browserResult = { ...result, userAgent: navigator.userAgent };
  window.__DEVSTASH_VAULT_CRYPTO_PROOF__ = browserResult;
  const serialized = JSON.stringify(browserResult);
  document.body.textContent = serialized;
  await fetch("/result", {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: serialized,
    cache: "no-store",
  });
}

async function runProof(): Promise<void> {
  const zeroEntropy = new Uint8Array(32);
  const zeroPhrase = `${"abandon ".repeat(23)}art`;
  if (encodeRecoveryEntropy(zeroEntropy) !== zeroPhrase) throw new Error("BIP39_ENCODE_FAILED");
  const decoded = decodeRecoveryPhrase(zeroPhrase);
  if (bytesToHex(decoded) !== "00".repeat(32)) throw new Error("BIP39_DECODE_FAILED");

  const entropy = hexToBytes("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f");
  const recoverySalt = hexToBytes("202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f");
  const rawDek = hexToBytes("404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f");
  const wrapNonce = hexToBytes("606162636465666768696a6b");
  const recordNonce = hexToBytes("707172737475767778797a7b");
  const profileId = "018f0d86-7b3a-4f9c-8a21-123456789abc";
  const recordId = "018f0d86-7b3a-4f9c-8a21-abcdefabcdef";
  const recoveryAad = buildRecoveryWrapAad("user_abc", profileId, 1);
  const recordAad = buildRecordAad("user_abc", recordId, "note", [profileId]);
  const plaintext = encodeUtf8(JSON.stringify({ title: "synthetic" }));
  const argonSalt = hexToBytes("000102030405060708090a0b0c0d0e0f");
  let wrappedDek: Uint8Array | undefined;
  let encryptedNonce: Uint8Array | undefined;
  let encryptedCiphertext: Uint8Array | undefined;
  let decrypted: Uint8Array | undefined;

  try {
    const rwk = await deriveRecoveryWrappingKey(entropy, recoverySalt);
    wrappedDek = await wrapRawDek(rwk, rawDek, wrapNonce, recoveryAad);
    const unwrappedDek = await unwrapDek(rwk, wrappedDek, wrapNonce, recoveryAad);
    const encrypted = await encryptRecordBytes(unwrappedDek, plaintext, recordAad, recordNonce);
    encryptedNonce = encrypted.nonce;
    encryptedCiphertext = encrypted.ciphertext;
    decrypted = await decryptRecordBytes(
      unwrappedDek,
      encryptedCiphertext,
      encryptedNonce,
      recordAad,
    );
    if (bytesToHex(decrypted) !== bytesToHex(plaintext)) throw new Error("AES_GCM_ROUND_TRIP_FAILED");

    const argon2idDurationMs = await benchmarkArgon2idInWorker("synthetic-phase-four-passphrase", {
      salt: argonSalt,
      workerFactory: () => new Worker("/vault-crypto.worker.js", { type: "module" }),
    });

    const workerFactory = () => new Worker("/vault-crypto.worker.js", { type: "module" });
    const ownerId = "browser_proof_user";
    const initialPassphrase = "synthetic browser lifecycle passphrase";
    const changedPassphrase = "synthetic browser changed passphrase";
    const recoveredPassphrase = "synthetic browser recovered passphrase";
    const setup = await setupVaultInWorker(ownerId, initialPassphrase, { workerFactory });

    let wrongPassphraseRejected = false;
    try {
      await unlockVaultInWorker(ownerId, setup.profile, "synthetic browser incorrect passphrase", {
        workerFactory,
      });
    } catch {
      wrongPassphraseRejected = true;
    }
    if (!wrongPassphraseRejected) throw new Error("WRONG_PASSPHRASE_ACCEPTED");
    await unlockVaultInWorker(ownerId, setup.profile, initialPassphrase, { workerFactory });

    const changed = await changePassphraseInWorker(
      ownerId,
      setup.profile,
      initialPassphrase,
      changedPassphrase,
      { workerFactory },
    );
    await unlockVaultInWorker(ownerId, changed.profile, changedPassphrase, { workerFactory });

    const recovered = await recoverVaultInWorker(
      ownerId,
      changed.profile,
      setup.recoveryPhrase,
      recoveredPassphrase,
      { workerFactory },
    );
    const rotated = await rotateRecoveryPhraseInWorker(
      ownerId,
      recovered.profile,
      recoveredPassphrase,
      { workerFactory },
    );

    let oldRecoveryRejected = false;
    try {
      await recoverVaultInWorker(
        ownerId,
        rotated.profile,
        setup.recoveryPhrase,
        "synthetic browser final passphrase",
        { workerFactory },
      );
    } catch {
      oldRecoveryRejected = true;
    }
    if (!oldRecoveryRejected) throw new Error("OLD_RECOVERY_PHRASE_ACCEPTED");
    await recoverVaultInWorker(
      ownerId,
      rotated.profile,
      rotated.recoveryPhrase,
      "synthetic browser final passphrase",
      { workerFactory },
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    if (cspViolations.length > 0) throw new Error("CSP_VIOLATION");
    await publish({
      ok: true,
      argon2idDurationMs,
      lifecycleOperations: 9,
      cspViolationCount: 0,
    });
  } finally {
    clearBytes(
      zeroEntropy,
      decoded,
      entropy,
      recoverySalt,
      rawDek,
      wrapNonce,
      recordNonce,
      recoveryAad,
      recordAad,
      plaintext,
      argonSalt,
      wrappedDek,
      encryptedNonce,
      encryptedCiphertext,
      decrypted,
    );
  }
}

runProof().catch((error: unknown) => {
  void publish({
    ok: false,
    cspViolationCount: cspViolations.length,
    error: error instanceof Error ? error.message : "UNKNOWN_FAILURE",
  });
});
