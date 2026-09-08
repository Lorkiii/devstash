// Browser-only password generation. Uses crypto.getRandomValues with rejection
// sampling so every alphabet character is equally likely; no modulo bias, no
// Math.random. Generated values never leave the browser.

export interface PasswordOptions {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
  /** Drop visually ambiguous characters such as 0/O and 1/l/I. */
  excludeAmbiguous: boolean;
}

export const PASSWORD_LENGTH_MIN = 8;
export const PASSWORD_LENGTH_MAX = 64;

const SETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?/~",
};

const AMBIGUOUS = new Set(["0", "O", "o", "1", "l", "I", "|", "`", "'", '"']);

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 24,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false,
};

function activeSets(options: PasswordOptions): string[] {
  const filter = (set: string) =>
    options.excludeAmbiguous ? [...set].filter((char) => !AMBIGUOUS.has(char)).join("") : set;
  const sets: string[] = [];
  if (options.lowercase) sets.push(filter(SETS.lowercase));
  if (options.uppercase) sets.push(filter(SETS.uppercase));
  if (options.digits) sets.push(filter(SETS.digits));
  if (options.symbols) sets.push(filter(SETS.symbols));
  return sets.filter((set) => set.length > 0);
}

export function buildAlphabet(options: PasswordOptions): string {
  return activeSets(options).join("");
}

export function entropyBits(options: PasswordOptions): number {
  const alphabet = buildAlphabet(options);
  if (alphabet.length === 0) return 0;
  return Math.round(options.length * Math.log2(alphabet.length));
}

// Uniform integer in [0, max) via rejection sampling over 32-bit randomness.
function uniformIndex(max: number): number {
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    if (buffer[0] < limit) return buffer[0] % max;
  }
}

function drawPassword(alphabet: string, length: number): string {
  let out = "";
  for (let index = 0; index < length; index += 1) {
    out += alphabet[uniformIndex(alphabet.length)];
  }
  return out;
}

// Regenerate until every selected set is represented. Rejection keeps the
// distribution uniform over all passwords that satisfy the constraint.
export function generatePassword(options: PasswordOptions): string {
  const sets = activeSets(options);
  const alphabet = sets.join("");
  if (alphabet.length === 0) {
    throw new Error("Select at least one character set");
  }
  const length = Math.min(PASSWORD_LENGTH_MAX, Math.max(PASSWORD_LENGTH_MIN, options.length));

  for (;;) {
    const candidate = drawPassword(alphabet, length);
    const coversAllSets = sets.every((set) => [...candidate].some((char) => set.includes(char)));
    if (coversAllSets || sets.length > length) return candidate;
  }
}
