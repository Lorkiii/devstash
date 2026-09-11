# Vault lifecycle implementation

**Phase:** 5 of 10
**Evidence date:** 2026-09-11
**Status:** implemented locally; database activation and browser runtime QA pending

This record separates the approved Phase 5 lifecycle from the Phase 4 primitive
proof. It covers the encryption profile and key lifecycle only. It does not add
vault-item storage, encrypted item CRUD, workspace modules, deployment, or a
production-readiness claim.

## Implemented lifecycle

- First setup derives a passphrase KEK with the versioned Argon2id candidate,
  generates one random DEK and 256 bits of recovery entropy, encodes a 24-word
  English BIP-39 Recovery Phrase, and independently wraps the same DEK under the
  passphrase KEK and HKDF-derived recovery key.
- Setup displays the Recovery Phrase once and requires complete re-entry plus an
  explicit acknowledgement before the ciphertext-only encryption profile can be
  persisted.
- Normal unlock derives and unwraps locally. A wrong passphrase and a corrupted
  matching wrapper produce the same generic local error and make no credential
  verification request to the server.
- Lost-passphrase recovery unwraps locally with the Recovery Phrase and requires
  a new passphrase wrapper before private routes mount.
- Passphrase change verifies the current passphrase and rewraps the existing DEK;
  it does not re-encrypt records.
- Recovery Phrase rotation generates a new phrase and recovery wrapper for the
  existing DEK. The replacement is not activated until full phrase confirmation.
- Explicit lock, refresh, page exit, inactivity, session loss, and sign-out clear
  reachable DEK references, decrypted collections, drafts, reveals, and timers.
  Lock, sign-out, and encryption-profile replacement are broadcast as keyless
  signals to other same-origin tabs. A profile replacement locks the other tabs
  and makes them refetch only the latest ciphertext metadata.
- Every tab starts locked. No key, passphrase, Recovery Phrase, decoded recovery
  entropy, or decrypted vault collection is stored in Web Storage, IndexedDB,
  cookies, URLs, or a server-bound payload.

JavaScript cannot guarantee physical memory erasure. The implementation limits
secret lifetime, clears reachable byte buffers where possible, and removes
references on lifecycle transitions without making a stronger claim.

## Client and worker boundary

`app/lib/vault-crypto/operations.ts` owns setup, unlock, recovery, and rewrap
orchestration. `vault-crypto.worker.ts` runs those operations in a short-lived,
same-origin worker. The client terminates the worker after each response,
cancellation, or failure.

Successful lifecycle responses contain only a non-extractable DEK `CryptoKey`,
the public/ciphertext encryption-profile DTO, and, only for setup or recovery
rotation, the one-time Recovery Phrase needed for confirmation. The worker never
returns plaintext KEK, RWK, DEK bytes, or decoded recovery entropy.

The unlocked DEK is held in a React provider ref. Private page content mounts
only while that ref and the unlocked state agree. Phase 5 intentionally exposes
an empty in-memory vault collection because real record persistence belongs to
Phase 6.

## Ciphertext-only profile persistence

`VaultEncryptionProfile` stores one profile per authenticated user with:

- the exact KDF algorithm, version, parameters, salt, and passphrase encoding;
- passphrase and recovery AES-256-GCM wrapper ciphertext and fresh 96-bit nonces;
- wrapper, AAD, recovery-KDF, and profile versions; and
- timestamps and the owner relationship required for authorization.

The Route Handler derives ownership only from the verified server session. GET,
create, and compare-and-swap update operations use owner-scoped data access,
strict Zod contracts, bounded request bodies, minimal DTOs, `Cache-Control:
no-store`, and trusted-origin checks for mutations. Browser-provided owner IDs
and unknown fields are rejected. The server increments profile and wrapper
revisions; clients cannot choose the next revision.

No separate passphrase or Recovery Phrase verifier exists. Authenticated DEK
unwrapping is the only correctness check.

## Database activation boundary

The Prisma schema and the pending migration artifact
`20260911000000_vault_encryption_profile` describe the Phase 5 profile table and
database constraints. The migration has not been applied to Neon or any other
database. `prisma generate`, validation, tests, and builds do not apply it.

Activation requires a separate explicit approval after confirming the intended
project, branch, database, schema, and migration status. Phase 5 UI flows that
need profile persistence cannot complete against a database without this table.

## Verification scope and remaining gates

Focused synthetic tests cover setup, correct and wrong passphrases, passphrase
rewrapping, correct and wrong Recovery Phrases, mandatory recovery rewrap,
Recovery Phrase rotation, old/new phrase behavior, and strict profile validation.
The browser proof entry also exercises the Phase 5 worker messages.

Current local checks:

- `npm run lint` passed.
- `npm test` passed all 38 tests.
- `npm run db:validate` passed without connecting to or changing Neon.
- `npm run build` passed and generated the Prisma client locally.
- `npm run test:crypto:browser:build` produced the browser proof bundle.
- `git diff --check` passed.

The browser harness bundles successfully, but its extended Phase 5 path has not
been observed at runtime in this session because no controllable browser surface
was available. Manual UI, keyboard, responsive, inactivity-timer, multi-tab,
refresh, session-loss, and sign-out behavior therefore remain unverified.

The Phase 4 device-class benchmarking and actual production nonce-based CSP
gates also remain open. Phase 5 does not authorize a weaker KDF, a CSP relaxation,
or a server-side fallback.
