import "client-only";

import { parseVaultEncryptionProfile } from "./vault-crypto/profile";
import type { VaultEncryptionProfile } from "./vault-profile.types";

export class VaultProfileRequestError extends Error {
  override readonly name = "VaultProfileRequestError";

  constructor(readonly status: number) {
    super("Vault profile request failed.");
  }
}

function isSuccessEnvelope(value: unknown): value is { success: true; data: unknown } {
  return typeof value === "object" && value !== null &&
    "success" in value && value.success === true && "data" in value;
}

async function readResponse(response: Response): Promise<unknown> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new VaultProfileRequestError(response.status || 500);
  }
  if (!response.ok || !isSuccessEnvelope(payload)) {
    throw new VaultProfileRequestError(response.status || 500);
  }
  return payload.data;
}

export async function fetchVaultProfile(signal?: AbortSignal): Promise<VaultEncryptionProfile | null> {
  const response = await fetch("/api/vault/profile", {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  const data = await readResponse(response);
  return data === null ? null : parseVaultEncryptionProfile(data);
}

export async function persistNewVaultProfile(
  profile: VaultEncryptionProfile,
): Promise<VaultEncryptionProfile> {
  const response = await fetch("/api/vault/profile", {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });
  return parseVaultEncryptionProfile(await readResponse(response));
}

export async function persistPassphraseReplacement(
  previous: VaultEncryptionProfile,
  replacement: VaultEncryptionProfile,
): Promise<VaultEncryptionProfile> {
  const response = await fetch("/api/vault/profile", {
    method: "PATCH",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "replace-passphrase",
      expectedProfileRevision: previous.profileRevision,
      expectedPassphraseWrapRevision: previous.passphraseWrapRevision,
      kdf: replacement.kdf,
      passphraseKeyWrap: replacement.passphraseKeyWrap,
    }),
  });
  return parseVaultEncryptionProfile(await readResponse(response));
}

export async function persistRecoveryReplacement(
  previous: VaultEncryptionProfile,
  replacement: VaultEncryptionProfile,
): Promise<VaultEncryptionProfile> {
  const response = await fetch("/api/vault/profile", {
    method: "PATCH",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "replace-recovery",
      expectedProfileRevision: previous.profileRevision,
      expectedRecoveryWrapRevision: previous.recoveryWrapRevision,
      recovery: replacement.recovery,
    }),
  });
  return parseVaultEncryptionProfile(await readResponse(response));
}
