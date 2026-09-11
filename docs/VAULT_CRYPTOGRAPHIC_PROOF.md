# Vault cryptographic proof

**Phase:** 4 of 10
**Evidence date:** 2026-09-11
**Status:** local primitive and desktop-browser proof complete; device and production-CSP release gates open

This record captures the implemented cryptographic primitives and the evidence
collected for the approved Phase 4 scope. It does not implement vault setup,
unlock, recovery, persistence, or any other Phase 5 behavior; those additions
are tracked separately in `VAULT_LIFECYCLE_IMPLEMENTATION.md`. It also does not
claim an independent security audit or production readiness.

## Implemented boundary

The browser-only modules under `app/lib/vault-crypto/` now provide:

- strict UTF-8, NFC passphrase, hexadecimal, and unpadded Base64URL encoding;
- exact versioned JSON-array AAD for passphrase wrappers, recovery wrappers,
  and encrypted records;
- browser-generated UUID v4 identifiers and bounded secure-random byte output;
- Argon2id v1.3 key derivation through a lazily loaded same-origin worker;
- 256-bit entropy to 24-word English BIP-39 encoding and checksum validation,
  without BIP-39 wallet-seed derivation;
- HKDF-SHA-256 recovery-key derivation and AES-256-GCM wrapping, unwrapping,
  record encryption, and authenticated decryption through Web Crypto; and
- non-extractable imported AES-GCM keys, generic authentication failures, fresh
  default 96-bit nonces, bounded KDF parameters, worker cancellation, and
  best-effort clearing of reachable byte buffers.

At the close of Phase 4, the worker accepted synthetic benchmark input and
returned only a duration or a generic failure. Phase 5 extends that same
short-lived worker with lifecycle messages while preserving the server and
persistent-storage boundary. The extension is not retroactive Phase 4 scope.

## Dependency review

The application dependencies are exact-pinned in `package.json` and resolved
with SHA-512 integrity entries in `package-lock.json`.

| Package | Resolved | Approved Phase 4 use | Review result |
| --- | ---: | --- | --- |
| `libsodium-wrappers-sumo` | 0.8.4 | `crypto_pwhash` with explicit `ALG_ARGON2ID13` only | Resolves only `libsodium-sumo` 0.8.4; neither package has an install lifecycle script. The application wrapper rejects unsupported algorithms, versions, sizes, and allocation bounds before work. |
| `@scure/bip39` | 2.4.0 | Entropy-to-mnemonic and mnemonic-to-entropy with the English list only | Resolves only `@noble/hashes` 2.4.0; neither package has an install lifecycle script. The wallet-seed API is not imported. |
| `esbuild` | 0.28.2 | Development-only browser proof bundling | Already resolved through `tsx`; now direct-pinned so the proof harness is reproducible. It is not shipped as vault runtime code. |

The installed `libsodium-wrappers-sumo` release is based on libsodium 1.0.21,
and the upstream release is signed. The `@scure/bip39` project documents an
older independent audit and a later self-audit, but neither is treated as an
audit of DevStash or proof that release 2.4.0 is defect-free. Sources:
[libsodium.js releases](https://github.com/jedisct1/libsodium.js/releases) and
[`@scure/bip39`](https://github.com/paulmillr/scure-bip39).

The browser proof's lazy libsodium chunk is 576,008 uncompressed bytes. This
confirms the architecture's trust and bundle-size tradeoff: it must remain
self-hosted, lazy, isolated, exact-pinned, and absent from ordinary page startup.

## Fixed and negative vectors

The Node test suite verifies:

- the upstream libsodium Argon2id raw vector against the pinned package;
- five fixed DevStash Argon2id candidate vectors covering ASCII, preserved
  whitespace, normalized Unicode, and minimum/maximum passphrase lengths;
- the official 256-bit zero and all-`ff` BIP-39 English vectors plus the exact
  English word-list SHA-256 digest;
- a NIST AES-256-GCM zero-key vector;
- independently cross-checked fixed recovery HKDF, wrapped-DEK, AAD, and record
  ciphertext vectors;
- corrupted ciphertext, tag, nonce, AAD, owner, ID, type, and version failures;
- malformed Unicode, encoding, identifiers, phrase length/checksum, KDF bounds,
  and ciphertext sizes; and
- non-extractable imported DEKs and nonce uniqueness across a synthetic sample.

All fixtures are synthetic. The authoritative vector sources are the
[BIP-39 specification](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki),
[Trezor BIP-39 vectors](https://github.com/trezor/python-mnemonic/blob/master/vectors.json),
[libsodium Argon2id test](https://github.com/jedisct1/libsodium/blob/master/test/default/pwhash_argon2id.c),
and [NIST block-cipher mode validation](https://csrc.nist.gov/projects/cryptographic-algorithm-validation-program/cavp-testing-block-cipher-modes).

## Browser and CSP proof

`npm run test:crypto:browser:build` bundles the real browser modules and worker
for the documented browser floors. `npm run test:crypto:browser:serve` serves
that output on loopback with an enforcing policy whose relevant directives are:

```text
default-src 'none'
script-src 'self' 'wasm-unsafe-eval'
worker-src 'self'
connect-src 'self'
style-src 'none'
```

The Phase 4 run exercised BIP-39 encoding/decoding, HKDF, independent DEK
wrapping and unwrapping, AES-GCM record round-trip, the actual Argon2id worker,
and captured CSP violations. Its results from this Windows desktop on
2026-09-11 were:

| Browser | Version | Candidate duration | CSP violations | Result |
| --- | ---: | ---: | ---: | --- |
| Chrome | 146 | 293.9 ms | 0 | Pass |
| Edge | 152 | 306.8 ms | 0 | Pass |
| Firefox | 155 | 425 ms | 0 | Pass |

These are reference measurements, not final parameter-selection evidence. The
candidate remains Argon2id v1.3 with 65,536 KiB memory, three iterations,
parallelism one, a 16-byte salt, and a 32-byte output. The design target remains
roughly 500-1,000 ms on the slowest supported device, while the current
[OWASP floor](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
is 19 MiB, two iterations, and parallelism one.

## Open release gates

Phase 4 must remain open until all of the following are recorded:

1. The candidate is benchmarked on the slowest supported desktop and mobile
   device classes, and one release parameter set is approved without a silent
   per-device downgrade.
2. Current and previous stable Chrome, Edge, and Firefox majors pass; only the
   currently installed Windows versions were exercised here.
3. Desktop Safari and iOS/iPadOS Safari pass on real Apple hardware. Windows
   emulation is not evidence.
4. The actual Next.js production build passes with the production nonce-based
   CSP. The isolated proof validates the required WebAssembly and worker
   directives, but it does not resolve the repository's existing inline styles
   or establish the final application policy.
5. Resolved in Phase 5: setup, unlock, passphrase change, recovery, and recovery
   rotation worker messages have focused Node tests. The extended harness builds,
   but an observed browser run of those new messages remains pending and is
   recorded in the Phase 5 document.

Capability failure must remain closed. None of these gates may be addressed by
falling back to a weaker KDF, relaxing the CSP, or moving plaintext/key handling
to the server.
