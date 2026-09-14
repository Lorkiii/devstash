# Safety and productivity implementation

**Phase:** 8 of 10
**Evidence date:** 2026-09-13
**Status:** implemented locally; authenticated browser and database-backed restore QA pending

Phase 8 adds local decrypted search, a secure password generator, consistent
mask/reveal/copy safeguards, and versioned encrypted export/import. It reuses
the Phase 4 AES-256-GCM primitive and the Phase 5 in-memory DEK. It adds no
cryptographic dependency, plaintext server contract, Prisma model, or database
migration.

## Local search

`app/lib/local-search.ts` builds an in-memory index only while the unlocked
command palette is mounted. It covers:

- Generic Secret titles, field labels and values, notes, tags, and project names.
- Project names and descriptions.
- `.env` environment names, complete contents, and project names.
- Note titles, bodies, tags, and project names.
- Task titles, descriptions, due dates, project names, and category names.

Queries and the decrypted index never enter URLs, requests, server components,
storage, logs, or analytics. A match returns only the record title or safe
unlocked label, context already shown in the corresponding private screen, and
its existing route. Secret values and matching excerpts are never rendered in
the result row. Title matches rank ahead of matches in other private fields.

The command palette retains keyboard navigation, now connects the active option
to the focused search input with `aria-activedescendant`, announces only the
result count, and includes an explicit close control.

## Generator and sensitive-value controls

The password generator continues to use `crypto.getRandomValues()` with
32-bit rejection sampling. It never uses `Math.random()` or modulo-biased
selection. Generation rejects an empty alphabet and regenerates until every
selected character class is present. Generated passwords are now masked by
default and require explicit reveal or copy.

`app/lib/sensitive-value-controls.ts` centralizes reveal and copy behavior for
vault fields and complete `.env` bundles:

- Reveal is explicit and uses an absolute deadline.
- Revealed content hides on timeout, window blur, page hiding, or a backgrounded
  tab, and it unmounts on vault lock.
- Copy is explicit and reports success or failure without announcing the value.
- Buttons use keyboard-native controls and larger touch targets.

`app/lib/sensitive-clipboard.ts` retains only a SHA-256 digest of the last value
copied through these controls. After 30 seconds, and again on vault lock, it
tries to read the clipboard and clears it only when that digest still matches.
Browser permissions may prevent this, so the interface describes clearing as
best-effort and never guaranteed. A later clipboard value is not overwritten.

## Encrypted backup V1

The immutable V1 file has the exact top-level fields `format`, `formatVersion`,
`exportedAt`, `profile`, `records`, and `manifest`. `format` is
`devstash-encrypted-backup`; `formatVersion` is `1`. It contains:

- The authenticated user's existing public KDF metadata and two wrapped-DEK
  ciphertexts.
- Ciphertext envelopes and approved metadata for Vault Items, Projects, `.env`
  bundles, Notes, custom Task Categories, and Tasks.
- A fresh AES-256-GCM encrypted manifest.

No decrypted record, passphrase, Recovery Phrase, decoded recovery entropy,
KEK, RWK, or raw/extractable DEK is serialized. The browser refuses files over
32 MiB; the restore Route Handler independently enforces the same request bound
and every existing per-record ciphertext bound.

Export reads a repeatable database snapshot, verifies that its profile still
matches the unlocked profile, and locally decrypts the complete snapshot before
creating a file. This prevents an already-corrupt collection from being
presented as a tested backup. The generated filename contains only a fixed
prefix and export timestamp.

### Manifest authentication

The browser hashes the compact canonical JSON for the five non-manifest fields
with Web Crypto SHA-256. SHA-256 is used only for content integrity, never for
passphrase derivation. This exact canonical manifest payload is then encrypted
under the current non-extractable DEK:

```json
{
  "manifestVersion": 1,
  "backupFormatVersion": 1,
  "profileId": "<profile UUID>",
  "profileRevision": 1,
  "exportedAt": "<canonical ISO timestamp>",
  "contentSha256": "<canonical Base64URL digest>"
}
```

The manifest uses a fresh 96-bit nonce, a 128-bit tag, and this exact UTF-8 JSON
AAD array:

```json
["devstash","encrypted-backup-manifest",1,"<owner ID>","<profile UUID>",1,"<export timestamp>"]
```

The profile revision occupies the second-to-last position. The owner binding
means a backup copied to another DevStash account cannot authenticate or decrypt
there, which is consistent with every record's owner-bound AAD.

### Restore flow and server boundary

Restore is available only from the authenticated locked screen. The user selects
the encrypted JSON file, supplies that backup's Vault Passphrase, and explicitly
acknowledges replacement. Before a mutation request, the browser:

1. Strictly parses versions, exact keys, encodings, timestamps, size bounds,
   duplicate IDs, and relationships.
2. Derives the backup KEK in the existing short-lived worker and unwraps the
   included DEK locally.
3. Authenticates the manifest and recomputes the complete-file digest.
4. Authenticates and decrypts every record locally, including relationship AAD
   and duplicated Task metadata, without mounting a partial collection.

Only after all four checks pass does `PUT /api/vault/backup` receive the same
ciphertext-only file. The handler derives the owner from the verified Auth.js
session, enforces the trusted origin, strictly validates the bounded body, and
never accepts an owner ID. A compare-and-swap expectation for the current
profile ID and revision prevents overwriting a vault changed by another tab
after the restore screen loaded. The service atomically replaces only that owner's
profile and records in a serializable transaction, restoring parents before
children and preserving approved timestamps. Any validation, relationship,
unique-key, foreign-key, or serialization conflict keeps the previous vault;
there is no partial restore.

The server cannot authenticate the encrypted manifest because it never has the
DEK. Manifest and full-record verification are therefore mandatory browser
preconditions, while the server independently enforces authentication,
ownership, origin, ciphertext shape, and transaction integrity.

An encrypted backup is not a recovery bypass. Its profile remains subject to
offline passphrase guessing by anyone who obtains the file, and a matching
passphrase is required by this restore flow. Losing both the Vault Passphrase
and Recovery Phrase still makes vault content unrecoverable through DevStash.
Older backups retain their older wrappers and corresponding credential risk.

## Database and release boundary

Phase 8 adds no schema change. It depends on the unapplied Phase 5, 6, and 7
vault-profile, vault-item, and workspace migrations. No migration, `db push`,
seed, reset, Neon mutation, deployment, or production configuration change was
performed in this phase.

Synthetic tests cover local search (including matches on hidden values without
rendering them), password character constraints, exact backup validation,
duplicate/orphan/timestamp rejection, fresh manifest nonces, manifest removal
tampering, owner-AAD tampering, and a complete local decrypt of every current
encrypted record type.

Authenticated browser QA remains required for responsive layout, focus and
screen-reader behavior, timed reveal on real page lifecycle events, clipboard
permissions/clearing, file download/upload, wrong-passphrase messaging,
cross-tab locking, database transaction rollback, and a full export-delete-
restore exercise on an isolated database branch. Phase 8 is not a security
audit or production-readiness claim. Phase 9 hardening has not started.
