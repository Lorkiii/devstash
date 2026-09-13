# Encrypted workspace modules implementation

**Phase:** 7 of 10
**Evidence date:** 2026-09-11
**Status:** implemented locally; database activation and authenticated browser QA pending

Phase 7 replaces the Projects/`.env`, Notes, and Tasks preview data with
browser-encrypted records and owner-scoped ciphertext persistence. It reuses the
reviewed Phase 4 AES-256-GCM record primitive and the in-memory DEK from Phase 5.
It does not add a new cryptographic dependency or change a released envelope.

## Browser-only payloads

Every record ID is generated in the browser before encryption. V1 AAD binds the
authenticated owner, record ID, entity type, and optional project relationship.
Every create or update uses a fresh 96-bit nonce.

- Phase 7 extends Generic Secret records with an optional project relationship.
  The project ID is authenticated in AAD; the title, value, notes, and tags keep
  the Phase 6 encrypted payload shape.
- `project`: encrypts payload version, name, and description.
- `env-bundle`: encrypts payload version, environment name, and the complete
  `.env` text, including variable names and values. Its project ID is required
  relationship metadata and is authenticated in AAD.
- `note`: encrypts payload version, title, body, and tags. An optional project
  ID is authenticated in AAD.
- `task-category`: encrypts a custom category name and one reviewed palette
  token. Work, Lifestyle, and Sports are public built-in definitions with
  stable reserved IDs; arbitrary CSS never enters the payload or server.
- `task`: encrypts payload version, title, description, due date, completion,
  and sort order. Only completion, sort order, and category relationship data
  are stored as approved plaintext metadata. Decryption rejects completion or
  sort-order mismatch, while AAD authenticates project and category IDs.

Task relationship AAD always orders IDs as `[projectId, categoryId]` with null
entries omitted. The public built-in IDs are fixed as
`10000000-0000-4000-8000-000000000001` (Work),
`10000000-0000-4000-8000-000000000002` (Lifestyle), and
`10000000-0000-4000-8000-000000000003` (Sports). Custom category ciphertext
uses the exact JSON key order `payloadVersion`, `name`, `colorToken`; these
reserved IDs are rejected for custom records by both validation and SQL checks.

Canonical key order, exact-key parsing, UTF-8 byte budgets, field limits, and
version dispatch are enforced before plaintext enters unlocked state. Unlock
fetches all Phase 6 and Phase 7 ciphertext first, authenticates and decrypts the
complete collection, validates project relationships, and then mounts private
pages. Any corrupt envelope, payload, relationship, or task metadata keeps the
vault locked without returning a partial collection.

## Ciphertext-only server boundary

The following Node.js Route Handlers use private `no-store` responses:

- Phase 6 `/api/vault/items` handlers accept the new optional project ID while
  retaining their ciphertext-only payload.
- `/api/projects` and `/api/projects/[id]`
- `/api/env-bundles` and `/api/env-bundles/[id]`
- `/api/notes` and `/api/notes/[id]`
- `/api/tasks` and `/api/tasks/[id]`
- `/api/task-categories` and `/api/task-categories/[id]`

Every handler derives ownership from the verified Auth.js session, strictly
validates IDs and bounded request bodies, checks the trusted mutation origin,
and returns only minimal ciphertext DTOs. Services scope every read, replace,
and delete by `ownerId`. A browser-provided owner ID is not accepted.

Project relationships, including Generic Secret links, and custom-category
relationships use compound owner-scoped foreign keys so a child record cannot
reference another user's record even if an application check regresses. Services
also verify each target before writes. Built-in task categories are allowlisted
public keys. Project and custom-category deletion is rejected while children
remain linked; the browser must delete or re-encrypt/unassign those records
first. This avoids server-side plaintext access and avoids silently cascading
private workspace content.

## Unlocked UI lifecycle

Projects, `.env` bundles, notes, tasks, and custom task categories support
local-encrypt/create, authenticated decrypt/read, re-encrypt/update, and
confirmed hard delete.
Project and category assignment changes re-encrypt with new relationship AAD.
Task completion also re-encrypts the task so its plaintext completion metadata
remains bound to the authenticated payload. Deleting a custom category requires
confirmation, re-encrypts its tasks as Uncategorized in the browser, then deletes
the unreferenced ciphertext category. Completed reassignments remain saved if a
later request fails.

Form drafts, decrypted collections, the DEK handle, and in-flight response
access are cleared or made unreachable by the existing lock, refresh,
inactivity, session-loss, multi-tab, and sign-out lifecycle. `.env` reveal and
copy remain explicit browser actions; the complete file is masked by default,
and plaintext is never uploaded.

## Database activation boundary

`prisma/migrations/20260911180000_workspace_modules` adds the optional
owner-scoped project relationship to `VaultItem` and creates `Project`,
`EnvBundle`, `Note`, `TaskCategory`, and `Task`, including envelope checks,
owner indexes, same-owner relationships, built-in category checks, and
ciphertext-size constraints. It has not been
applied to Neon or any other database. The earlier pending vault-profile and
vault-item migrations must be present first.

Activation requires separate approval after confirming the intended Neon
project, isolated branch, database, schema, and current migration history. This
phase did not run `prisma migrate`, `prisma db push`, a seed, a reset, or a Neon
mutation.

## Verification scope and remaining gates

Synthetic tests cover strict ciphertext contracts, unknown owner fields,
oversized input, canonical project/category relationships, curated category
colors, local round trips, fresh nonces, relationship-AAD tampering, and task
metadata tampering. Prisma
validation, lint, production compilation, and whitespace checks cover local
schema and code integration.

Current local checks:

- `npm test` passed all 51 tests.
- `npm run lint` passed.
- `npm run db:validate` passed without connecting to or changing Neon.
- `npm run build` passed and generated the Prisma client locally.
- `npm run test:crypto:browser:build` produced the browser proof bundle; it did
  not execute authenticated browser QA.
- `git diff --check` passed.

Database-backed ownership/IDOR behavior and authenticated browser create/edit/
delete, responsive, keyboard, refresh, inactivity, pending-mutation lock, and
multi-tab behavior remain runtime gates. Phase 8 broader local-search/reveal/copy
hardening and encrypted export/import were not implemented here. Phase 7 is not
a security audit or production-readiness claim.
