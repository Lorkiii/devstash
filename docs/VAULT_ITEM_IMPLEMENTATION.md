# Ciphertext-only vault item implementation

**Phase:** 6 of 10
**Evidence date:** 2026-09-11
**Status:** implemented locally; database activation and browser runtime QA pending

Phase 6 adds the first encrypted record type end to end without starting the
workspace modules in Phase 7. `GENERIC_SECRET` is the only accepted item type in
this phase. Login, API key, database, SSH, recovery-code, project, `.env`, note,
and task persistence remain outside this implementation.

## Browser-only payload

The browser validates and serializes a Generic Secret in this exact V1 key
order before UTF-8 encoding and AES-256-GCM encryption:

```json
{
  "payloadVersion": 1,
  "title": "<private title>",
  "value": "<private value>",
  "notes": "<private notes or null>",
  "tags": ["<private tag>"]
}
```

The title, value, notes, and tags never enter a Route Handler, server module, URL,
log, or database column. The payload is limited to 32,768 UTF-8 bytes. The record
ID is generated in the browser before encryption, and the V1 record AAD is built
from the authenticated owner ID, item UUID, `vault-item` entity type, and an empty
relationship-ID array. Every create and update generates a fresh 96-bit nonce.

Phase 7 adds an optional owner-scoped project relationship to this record. The
project ID is authenticated in the AAD relationship array and stored as approved
plaintext metadata; the Generic Secret JSON payload above remains unchanged.
The later workspace migration adds the database column and compound foreign key.

On unlock, the browser fetches the current user's ciphertext, reconstructs AAD,
authenticates and decrypts every supported record, and mounts private pages only
after the complete collection succeeds. A corrupt envelope or payload keeps the
vault locked and returns no partial decrypted collection. Lock, refresh, session
loss, and sign-out still discard the key handle, decrypted records, form drafts,
reveals, and pending-request access to the UI.

## Ciphertext-only server boundary

`GET /api/vault/items` and `POST /api/vault/items` list and create records.
`PATCH /api/vault/items/[id]` and `DELETE /api/vault/items/[id]` replace or
hard-delete one record. Every handler:

- derives the owner only from the verified Auth.js session;
- strictly validates the path and bounded ciphertext envelope;
- applies the existing trusted-origin protection to mutations;
- scopes persistence by both owner and record ID near Prisma;
- returns a minimal ciphertext DTO with private no-store headers; and
- uses safe errors without logging request or response bodies.

The server stores only the owner and record UUIDs, the Phase 7 optional project
UUID, fixed `GENERIC_SECRET` type, envelope version, AES-GCM algorithm/tag
size/nonce, combined ciphertext and tag, and timestamps. It cannot validate or
inspect the encrypted payload.

Deletion is a confirmed hard delete from the active table. It is not described
as immediate physical erasure because retained database history and backups may
temporarily preserve ciphertext.

## Database activation boundary

`prisma/migrations/20260911120000_vault_items` creates the ciphertext table,
length/version constraints, owner/update index, and cascading owner foreign key.
It has not been applied to Neon or any other database. The earlier pending
vault-profile migration must also exist in the target before this migration can
support the UI lifecycle.

Activation requires separate explicit approval after confirming the intended
Neon project, branch, database, schema, and migration status. This phase did not
run `prisma migrate`, `prisma db push`, a seed, a reset, or any Neon mutation.

## Verification scope and remaining gates

Synthetic tests cover strict item envelopes, rejected owner/path/type/size drift,
Generic Secret normalization, round-trip encryption, fresh nonces, owner and ID
AAD tampering, unknown private payload fields, and the UTF-8 byte limit. Static
checks validate the Prisma model, Route Handler types, client/server boundaries,
and production compilation.

Current local checks:

- `npm test` passed all 44 tests.
- `npm run lint` passed.
- `npm run db:validate` passed without connecting to or changing Neon.
- `npm run build` passed and generated the Prisma client locally.
- `npm run test:crypto:browser:build` produced the existing browser proof bundle.
- `git diff --check` passed.

Database-backed ownership/IDOR behavior, authenticated browser create/edit/delete,
responsive and keyboard behavior, lock during pending mutation, refresh, and
multi-tab behavior remain runtime gates until the migrations are tested and
activated on an explicitly approved isolated database target. Phase 4 device
benchmarking and production nonce-based CSP proof also remain open. Phase 6 is
not a security audit or production-readiness claim.
