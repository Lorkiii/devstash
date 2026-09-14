import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PASSWORD_OPTIONS,
  buildAlphabet,
  entropyBits,
  generatePassword,
} from "../app/lib/password-generator";

test("password generator uses the requested length and every selected set", () => {
  for (let index = 0; index < 32; index += 1) {
    const password = generatePassword(DEFAULT_PASSWORD_OPTIONS);
    assert.equal(password.length, DEFAULT_PASSWORD_OPTIONS.length);
    assert.match(password, /[a-z]/u);
    assert.match(password, /[A-Z]/u);
    assert.match(password, /[0-9]/u);
    assert.match(password, /[^A-Za-z0-9]/u);
    assert.ok([...password].every((character) => buildAlphabet(DEFAULT_PASSWORD_OPTIONS).includes(character)));
  }
});

test("password generator excludes ambiguous characters and rejects an empty alphabet", () => {
  const options = { ...DEFAULT_PASSWORD_OPTIONS, length: 64, excludeAmbiguous: true };
  assert.doesNotMatch(generatePassword(options), /[0Oo1lI|`'"]/u);
  assert.ok(entropyBits(options) > 300);
  assert.throws(() => generatePassword({
    ...DEFAULT_PASSWORD_OPTIONS,
    lowercase: false,
    uppercase: false,
    digits: false,
    symbols: false,
  }), /Select at least one/u);
});
