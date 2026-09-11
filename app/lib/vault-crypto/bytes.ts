import {
  PASSPHRASE_MAX_CODE_POINTS,
  PASSPHRASE_MIN_CODE_POINTS,
} from "./constants";
import { VaultCryptoUnavailableError, VaultCryptoValidationError } from "./errors";

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/u;

function isWellFormedUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      if (index + 1 >= value.length) return false;
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

export function encodeUtf8(value: string): Uint8Array {
  if (!isWellFormedUnicode(value)) {
    throw new VaultCryptoValidationError("Text must contain well-formed Unicode.");
  }
  return new TextEncoder().encode(value);
}

export function decodeUtf8(value: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(value);
  } catch {
    throw new VaultCryptoValidationError("Bytes must contain valid UTF-8.");
  }
}

export function encodePassphrase(passphrase: string): Uint8Array {
  if (typeof passphrase !== "string" || !isWellFormedUnicode(passphrase)) {
    throw new VaultCryptoValidationError("Passphrase must contain well-formed Unicode.");
  }

  const normalized = passphrase.normalize("NFC");
  const codePointLength = Array.from(normalized).length;
  if (
    codePointLength < PASSPHRASE_MIN_CODE_POINTS ||
    codePointLength > PASSPHRASE_MAX_CODE_POINTS
  ) {
    throw new VaultCryptoValidationError(
      `Passphrase must contain ${PASSPHRASE_MIN_CODE_POINTS} through ${PASSPHRASE_MAX_CODE_POINTS} Unicode code points.`,
    );
  }
  return encodeUtf8(normalized);
}

export function assertByteLength(
  value: Uint8Array,
  expectedLength: number,
  label: string,
): void {
  if (!(value instanceof Uint8Array) || value.byteLength !== expectedLength) {
    throw new VaultCryptoValidationError(`${label} must contain exactly ${expectedLength} bytes.`);
  }
}

export function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  return Uint8Array.from(value).buffer;
}

export function randomBytes(length: number): Uint8Array {
  if (!Number.isSafeInteger(length) || length <= 0) {
    throw new VaultCryptoValidationError("Random byte length must be a positive integer.");
  }
  if (!globalThis.crypto?.getRandomValues) {
    throw new VaultCryptoUnavailableError();
  }
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

export function clearBytes(...values: Array<Uint8Array | undefined>): void {
  for (const value of values) value?.fill(0);
}

export function bytesToBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

export function base64UrlToBytes(value: string): Uint8Array {
  if (
    typeof value !== "string" ||
    !BASE64URL_PATTERN.test(value) ||
    value.includes("=") ||
    value.length % 4 === 1
  ) {
    throw new VaultCryptoValidationError("Value must be canonical unpadded Base64URL.");
  }

  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4);
  let decoded: string;
  try {
    decoded = atob(padded);
  } catch {
    throw new VaultCryptoValidationError("Value must be canonical unpadded Base64URL.");
  }

  const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  if (bytesToBase64Url(bytes) !== value) {
    throw new VaultCryptoValidationError("Value must be canonical unpadded Base64URL.");
  }
  return bytes;
}

export function bytesToHex(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(value: string): Uint8Array {
  if (!/^(?:[0-9a-fA-F]{2})*$/u.test(value)) {
    throw new VaultCryptoValidationError("Value must contain complete hexadecimal bytes.");
  }
  return Uint8Array.from(value.match(/.{2}/gu) ?? [], (byte) => Number.parseInt(byte, 16));
}
