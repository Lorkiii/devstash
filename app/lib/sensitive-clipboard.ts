import "client-only";

import { bytesToBase64Url, clearBytes, encodeUtf8 } from "./vault-crypto/bytes";
import { digestSha256 } from "./vault-crypto/web-crypto";

export const SENSITIVE_CLIPBOARD_CLEAR_MS = 30_000;

let lastCopiedDigest: string | null = null;
let clearTimer: number | null = null;
let copyRevision = 0;

async function textDigest(value: string): Promise<string> {
  const bytes = encodeUtf8(value);
  try {
    const digest = await digestSha256(bytes);
    try {
      return bytesToBase64Url(digest);
    } finally {
      clearBytes(digest);
    }
  } finally {
    clearBytes(bytes);
  }
}

export async function clearSensitiveClipboardIfUnchanged(): Promise<void> {
  const expectedDigest = lastCopiedDigest;
  const revision = copyRevision;
  if (!expectedDigest || !navigator.clipboard?.readText) return;
  try {
    const current = await navigator.clipboard.readText();
    const currentDigest = await textDigest(current);
    if (revision === copyRevision && currentDigest === expectedDigest) {
      await navigator.clipboard.writeText("");
    }
  } catch {
    // Clipboard read/write permission is browser-controlled; clearing is only
    // a best-effort safety measure and must never be represented as guaranteed.
  } finally {
    if (revision === copyRevision) lastCopiedDigest = null;
  }
}

export async function copySensitiveText(value: string): Promise<void> {
  if (!navigator.clipboard?.writeText) throw new Error("Clipboard is unavailable.");
  const revision = copyRevision + 1;
  copyRevision = revision;
  await navigator.clipboard.writeText(value);
  const digest = await textDigest(value);
  if (revision !== copyRevision) return;
  lastCopiedDigest = digest;
  if (clearTimer !== null) window.clearTimeout(clearTimer);
  clearTimer = window.setTimeout(() => {
    clearTimer = null;
    void clearSensitiveClipboardIfUnchanged();
  }, SENSITIVE_CLIPBOARD_CLEAR_MS);
}
