import assert from "node:assert/strict";
import test from "node:test";
import { deriveArgon2idKeyBytes } from "../app/lib/vault-crypto/argon2id";
import { bytesToHex, clearBytes, encodePassphrase, hexToBytes } from "../app/lib/vault-crypto/bytes";
import {
  ARGON2ID_BENCHMARK_CANDIDATE,
  type Argon2idParameters,
} from "../app/lib/vault-crypto/constants";

test("libsodium-wrappers-sumo matches its upstream Argon2id raw vector", async () => {
  const { default: sodium } = await import("libsodium-wrappers-sumo");
  await sodium.ready;
  const password = hexToBytes(
    "a347ae92bce9f80f6f595a4480fc9c2fe7e7d7148d371e9487d75f5c23008ffae0" +
      "65577a928febd9b1973a5a95073acdbeb6a030cfc0d79caa2dc5cd011cef02c08d" +
      "a232d76d52dfbca38ca8dcbd665b17d1665f7cf5fe59772ec909733b24de97d6f5" +
      "8d220b20c60d7c07ec1fd93c52c31020300c6c1facd77937a597c7a6",
  );
  const salt = hexToBytes("5541fbc995d5c197ba290346d2c559de");
  const expected =
    "18acec5d6507739f203d1f5d9f1d862f7c2cdac4f19d2bdff64487e60d969e3ced615337b9eec6ac4461c6ca07f0939741e57c24d0005c7ea171a0ee1e7348249d135b38f222e4dad7b9a033ed83f5ca27277393e316582033c74affe2566a2bea47f91f0fd9fe49ece7e1f79f3ad6e9b23e0277c8ecc4b313225748dd2a80f5679534a0700e246a79a49b3f74eb89ec6205fe1eeb941c73b1fcf1";
  const output = sodium.crypto_pwhash(
    155,
    password,
    salt,
    5,
    7_256_678,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
  );
  assert.equal(bytesToHex(output), expected);
  clearBytes(password, salt, output);
});

test("the 64 MiB candidate has fixed ASCII, whitespace, Unicode, and boundary vectors", async () => {
  const salt = hexToBytes("000102030405060708090a0b0c0d0e0f");
  const vectors = [
    ["correct horse battery staple", "0d1a3c6523c8f06e4e0af9c515aa5b5448cfebd6838f2d52c3d8b6ef8ddc3c2e"],
    ["  spaces stay exactly  ", "ed6262ccf0e2a41b942c966a28b9464f779797f321152d70017d5755e6bc24c3"],
    ["pa\u0308ssphrase-unicode-安全", "0a82dde9c0c00d7050a54ed70e53eefd1a09e0e853bfde1782ed046818398181"],
    ["a".repeat(15), "9e44addb2f6e964f79485230b8bce5a6244da3c1d66f3924ebd68099d6e347db"],
    ["🔐".repeat(128), "2ebe062c0c42e49eed3c90c93d41bd57fb6daa142f0572b49d5b52f74ca3978f"],
  ] as const;

  for (const [passphrase, expected] of vectors) {
    const passphraseBytes = encodePassphrase(passphrase);
    const output = await deriveArgon2idKeyBytes(
      passphraseBytes,
      salt,
      ARGON2ID_BENCHMARK_CANDIDATE,
    );
    assert.equal(bytesToHex(output), expected);
    clearBytes(passphraseBytes, output);
  }
  clearBytes(salt);
});

test("Argon2id rejects unsafe parameters and malformed inputs before work", async () => {
  const salt = hexToBytes("000102030405060708090a0b0c0d0e0f");
  const passphrase = encodePassphrase("synthetic-passphrase");
  const invalidParameters: Argon2idParameters[] = [
    { ...ARGON2ID_BENCHMARK_CANDIDATE, memoryKiB: 19_455 },
    { ...ARGON2ID_BENCHMARK_CANDIDATE, memoryKiB: 131_073 },
    { ...ARGON2ID_BENCHMARK_CANDIDATE, iterations: 1 },
    { ...ARGON2ID_BENCHMARK_CANDIDATE, iterations: 7 },
  ];
  for (const parameters of invalidParameters) {
    await assert.rejects(() => deriveArgon2idKeyBytes(passphrase, salt, parameters), /bounds/u);
  }
  await assert.rejects(
    () => deriveArgon2idKeyBytes(passphrase, new Uint8Array(15), ARGON2ID_BENCHMARK_CANDIDATE),
    /16 bytes/u,
  );
  await assert.rejects(
    () => deriveArgon2idKeyBytes(new Uint8Array(), salt, ARGON2ID_BENCHMARK_CANDIDATE),
    /cannot be empty/u,
  );
  clearBytes(passphrase, salt);
});
