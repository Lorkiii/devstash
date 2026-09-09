<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# DevStash project instructions

## Purpose and authority

DevStash is a personal, vault-first developer workspace for encrypted secrets,
.env configurations, private notes, projects, and tasks. Security is the
highest-priority requirement. Convenience, UI simplicity, search, performance,
and delivery speed must not weaken this security model.

These instructions apply to the entire repository. Nested AGENTS.md files may
add local guidance but must not weaken these rules. If a requested change
conflicts with an invariant, stop and explain the conflict instead of bypassing
or silently relaxing it.

## Working agreement

- Work one user-approved phase or bounded task at a time.
- Before editing, read applicable instructions and inspect git status and
  relevant diffs. Preserve unrelated user changes.
- Make the smallest readable change that fully meets the approved scope.
- Do not commit, push, deploy, provision cloud resources, or change production
  configuration without explicit user authorization.
- Do not run Prisma migrations, prisma db push, resets, seeds, or destructive
  Neon operations without explicit user authorization.
- Never request, expose, or log real passwords, passphrases, keys, tokens,
  OAuth secrets, database URLs, or production data. Use fake fixtures.
- Cryptography, authentication, recovery, plaintext metadata, third-party
  scripts, and trust-boundary changes require explicit architecture review.
- Report only checks actually run. A build is not browser QA, deployment is not
  production verification, and static review is not a security audit.

## V1 scope

DevStash V1 is an individual-user service open to verified Gmail identities.
Each authenticated user owns a separate private vault.

Include Google-only sign-in; a separately locked encrypted vault; login
credentials, API keys, access tokens, database and SSH credentials, recovery
codes, generic secrets, .env bundles, projects, private notes, tasks, local
decrypted search, masking, timed reveal, explicit copy, secure password
generation, auto-lock, and later encrypted export/import.

Exclude teams, organizations, roles, collaboration, sharing, public links,
browser extensions, autofill, mobile or desktop apps, TOTP, credential-rotation
automation, file storage, extra OAuth providers, third-party integrations, and
server-side plaintext search unless requirements explicitly change. Use YAGNI;
do not add speculative services, queues, caches, or abstractions.

## Technology baseline

- Use the installed Next.js App Router, React, and TypeScript versions. Read the
  bundled Next.js docs before relying on remembered APIs.
- Keep the current repository-root app directory unless a move is approved.
- Follow docs/PROJECT_STRUCTURE.md for file placement, naming, and imports.
- Use npm and the committed package-lock.json.
- Use Tailwind CSS and shadcn/ui.
- Use Auth.js with Google OAuth only.
- Use Neon Postgres, Prisma ORM, and Zod validation.
- Use Node.js runtime by default for authentication and database work.
- Use a vetted browser Argon2id implementation and Web Crypto for secure
  randomness, AES-256-GCM, and supported key operations.

Pin and review security-sensitive dependencies. Verify their maintenance,
browser/runtime compatibility, transitive dependencies, and CSP impact. Never
implement cryptographic algorithms manually.

## Security states and authentication

Google authentication establishes a verified identity and session. The Vault
Passphrase independently derives the key that unlocks vault data. Google
authentication must never automatically unlock the vault.

The application has three states:

1. Signed out and locked: redirect protected routes to /login and expose no
   private application data.
2. Authenticated and locked: show only the shell and vault setup or unlock. Do
   not show private titles, previews, URLs, or content.
3. Authenticated and unlocked: the browser temporarily holds the unwrapped DEK
   and may decrypt the authenticated user's ciphertext.

Refresh may preserve the Auth.js session but must return the vault to locked.
Vault locking and authentication logout are separate operations.

Required flow: verify the session; redirect signed-out users to /login; complete
Google OAuth; verify the Gmail identity and Google subject server-side; create the
session; redirect to /dashboard locked; then create or unlock the vault locally.

Authentication and authorization rules:

- Require a verified Gmail address and stable Google provider subject. Never
  trust browser-provided identity fields.
- Request only identity scopes. Do not add local passwords, registration,
  forgot-password, email verification, or another provider.
- Prefer revocable database-backed Auth.js sessions. If compatibility requires
  another strategy, document it while preserving every invariant.
- Use Auth.js protections and secure, HTTP-only, same-site cookies.
- Derive the current user from the verified server session for every operation.
- Never trust browser-supplied userId, email, accountId, or ownerId.
- Scope every CRUD operation by authenticated ownership near the data layer.
- Ciphertext is private and must not be returned to unauthorized requesters.
- Redirects and hidden controls are UX, not authorization.
- Treat every Route Handler and Server Action as attacker-reachable. Each must
  authenticate, authorize, validate, enforce ownership, and fail safely.

Use the current Next.js route interception convention only for optimistic
navigation checks, never as the only security layer.

## Client and server boundary

Vault plaintext belongs in the browser only.

Write flow: plaintext to client encryption to ciphertext to server to Neon.
Read flow: Neon to server to ciphertext to browser to client decryption.

- Server Components render only the authenticated shell and server-safe data.
- Client Components own passphrase input, KDF, encryption and decryption,
  unlocked state, reveal/copy, local search, and inactivity tracking.
- Use explicit ciphertext-only Route Handler contracts for V1 encrypted CRUD.
- Never pass decrypted data through Server Components, Server Actions, Route
  Handlers, RSC payloads, server HTML, or server-bound forms.
- Never put private content in URLs, route parameters, metadata, cache keys,
  logs, analytics, telemetry, or error reports.
- Private endpoints use Cache-Control: no-store and avoid static generation,
  shared caches, service-worker caches, and initial HTML serialization.

## Passphrase and envelope encryption

The Vault Passphrase exists only to derive key material locally. Never persist
it or send it to server code, Auth.js, or another service. Never put it in
cookies, localStorage, sessionStorage, IndexedDB, Cache Storage, URLs, logs,
analytics, errors, or environment variables. Keep it only for the shortest
practical derivation period and then remove reachable references. JavaScript
cannot guarantee physical memory erasure.

Do not store a separate fast passphrase verifier. Authenticated DEK unwrapping
is the correctness check. Wrong passphrases and corrupt wrapped keys receive the
same generic local error.

Envelope design:

- Vault Passphrase plus a random salt derives a 256-bit KEK with Argon2id.
- The KEK authentically unwraps a random 256-bit DEK.
- The DEK encrypts user data with AES-256-GCM.

Cryptographic rules:

- Web Crypto does not provide Argon2id; use a vetted browser implementation.
- Select KDF parameters from current authoritative guidance, benchmark supported
  devices, document them, and persist algorithm, parameters, salt, encoding,
  and version. Never silently reinterpret existing settings.
- Generate salts, keys, and nonces with secure browser randomness.
- Never use SHA-256 alone, SHA-1, MD5, Base64, string concatenation, custom
  loops, custom ciphers, XOR storage, or homemade cryptography.
- Generate a random 256-bit DEK during setup. For V1, wrap it under the KEK with
  AES-256-GCM authenticated encryption and a fresh nonce.
- Persist only the wrapped DEK and metadata. Plaintext KEK and DEK remain only
  in ephemeral client memory.
- Changing the passphrase derives a new KEK and rewraps the same DEK; it does not
  re-encrypt every record.
- Encrypt each record with AES-256-GCM, a fresh random 96-bit nonce per operation
  under a key, and a 128-bit authentication tag. Never reuse a nonce.
- Bind encryption version, owner, record ID, entity type, and security-relevant
  relationship IDs with authenticated additional data.
- Generate record IDs before encryption when IDs are authenticated.
- Use a documented, versioned UTF-8 JSON envelope. Authentication failure must
  never return partial or unauthenticated plaintext.
- Released formats are immutable without an approved, tested migration and
  backward-compatibility plan.

## Vault lifecycle, recovery, and backup

First setup occurs after authentication: collect and confirm the passphrase
locally; generate DEK and salt; derive KEK; wrap DEK; persist only wrapped key
and profile metadata; enter unlocked state after a successful local round trip.

Unlock by fetching the current user's wrapped DEK and KDF metadata, deriving the
KEK locally, and unwrapping locally. On failure, discard intermediates and make
no server verification request.

Locking removes reachable key references, decrypted collections, and sensitive
form state; hides revealed secrets; and returns to authenticated and locked.
Lock on explicit action, refresh, session loss, sign-out, and inactivity. Start
with a 15-minute inactivity default stored as a non-sensitive preference.

Sign-out cleans vault state, terminates the Auth.js session, then navigates to
/login. Navigation alone is not logout.

V1 has no server-side passphrase reset or decryption bypass. Losing the
passphrase means losing encrypted content; Google authentication cannot bypass
it. Recovery keys, trusted-device unlock, or escrow require a new threat model.

Encrypted export/import is backup, not recovery. It contains only the encryption
profile, ciphertext, approved metadata, versions, and integrity-protected
manifest data. Never create a plaintext export; test a full restore.

## Data classification and persistence

Encrypt user-authored content by default: secret values, usernames, labels,
URLs, notes, tags, .env project/environment/variable names and values, project
names and descriptions, note titles and bodies, and task titles/descriptions.

Approved plaintext metadata is narrow: record and owner IDs, required
relationship IDs and entity types, KDF/encryption identifiers and parameters,
salts, nonces, versions, timestamps, task completion and sort order when needed,
required authentication metadata, theme, and auto-lock duration.

Treat due dates, labels, filenames, tags, previews, and new fields as encrypted
unless explicitly reviewed. Never add plaintext mirrors for search, sorting,
debugging, or previews. Neon encryption, TLS, and backups are defense in depth,
not substitutes for client-side application encryption.

Design and review the exact Prisma schema in its approved phase. Conceptually use:

- An authentication user with required Auth.js and Google metadata but no vault
  passphrase or key.
- One vault encryption profile per user with KDF metadata, wrap metadata, wrapped
  DEK, cryptographic version, and timestamps.
- Clear VaultItem, Project, Note, and Task models with stable ID, owner, approved
  relationships/metadata, encrypted payload, nonce, version, and timestamps.

Enforce constraints and ownership in the database where practical and again in
the data layer. Complete encryption before server transactions. V1 deletion is
a confirmed hard delete, but do not claim immediate physical erasure from Neon
history/backups; retention may temporarily preserve ciphertext.

Feature rules:

- Initial vault types are LOGIN, API_KEY, ENVIRONMENT, DATABASE, SSH_KEY,
  RECOVERY_CODE, and GENERIC_SECRET. Prefer one encrypted payload per record.
- Encrypt complete .env bundles, including variable names and values. Copy or
  export only after local decryption and never upload plaintext.
- Encrypt project names/descriptions, note titles/bodies/tags, and task
  titles/descriptions/notes. Sanitize Markdown and never render arbitrary HTML.
- Local search fetches authorized ciphertext, decrypts in the browser, and
  searches memory. No plaintext search columns, blind indexes, or server
  decryption in V1.

## Neon, validation, and errors

- Use a pooled Neon connection for normal application traffic and a separate
  direct connection for migrations, dumps, restores, and administrative work.
  Never expose either to browser code or prefix it with NEXT_PUBLIC_.
- Keep schema and migrations in version control. Test migrations on an isolated
  Neon branch before requesting production authorization.
- Infrastructure secrets belong in deployment configuration, not vault records
  or Git. Commit only an .env.example with empty or fake values.
- Validate paths, queries, relevant headers, and bodies with strict Zod schemas.
  Validate envelope encoding/version, nonce length, algorithm, IDs,
  relationships, unknown fields, and bounded payload size.
- Client validation is UX only. Return minimal DTOs, not full Prisma objects.
- Use safe consistent errors: 401 unauthenticated, 403 forbidden, 404 when
  existence/ownership should be hidden, 400 or 422 validation, and 500
  unexpected failure.
- Mutations require CSRF and origin protections. Rate-limit authentication and
  abuse-prone endpoints. Local unlock delay cannot prevent offline guessing.

Never log passphrases, keys, plaintext, generated passwords, .env contents,
OAuth/session tokens, cookies, database URLs, authorization headers, or vault
request/response bodies. Production errors must not expose inputs, stack traces,
Prisma/SQL internals, provider responses, environment values, or paths.

## Browser security and sensitive UX

XSS can steal an unlocked vault. Treat XSS and supply-chain defense as part of
the cryptographic boundary.

- Prefer React text rendering and avoid dangerouslySetInnerHTML.
- Sanitize rich text and allow only intended URL schemes.
- Do not add analytics, replay, chat widgets, tag managers, ads, remote UI
  scripts, or other third-party scripts to authenticated vault pages.
- Prefer self-hosted assets.
- Maintain restrictive CSP and security headers. Do not add unsafe-inline,
  unsafe-eval, or wasm-unsafe-eval without review. Prove Argon2id works under
  the production CSP before adoption.
- Do not put secrets in DOM/data attributes, hidden inputs, metadata,
  accessibility labels, or toasts.
- Mask secrets by default; reveal explicitly and auto-hide after a short
  interval or lock.
- Clipboard copy is explicit. Clearing is best-effort and must not be described
  as guaranteed. Never copy automatically.
- Password generation uses unbiased secure browser randomness and never sends
  generated values to the server.

## Threat model and claims

DevStash reduces risk from database/snapshot leaks, forged identities,
cross-user access, accidental server plaintext handling during normal operation,
authenticated-encryption tampering, and network observation under correct HTTPS.

It does not fully protect against a compromised device/browser, malicious
extensions, keyloggers, screen/clipboard monitoring, XSS while unlocked,
malicious dependencies, compromised builds or deployments serving altered
JavaScript, weak passphrases, or Google compromise plus passphrase knowledge.

Describe DevStash as client-side encrypted by design. Never call it
zero-knowledge, unbreakable, audited, cryptographically erased, compliant, or
safe for important real credentials without independent evidence. Early versions
use synthetic secrets and remain a security-learning project.

## Implementation order

Keep modules small and boundaries clear. Follow the current root app layout.
Keep cryptography separate from UI, transport, and persistence; distinguish
encoding, KDF, key wrapping, payload encryption, version dispatch, and in-memory
lifecycle.

1. Architecture records: threat model, plaintext metadata, recovery, envelope,
   KDF/CSP compatibility, and supported browsers.
2. Foundation: shell, design tokens, shadcn/ui, login, locked dashboard,
   validation conventions, and test setup.
3. Authentication: Google-only Auth.js, verified Gmail and stable identity,
   sessions, route UX, centralized authorization, and ownership tests.
4. Cryptographic proof: reviewed Argon2id, versioned formats and AAD, isolated
   primitives, fixed vectors, negative tests, and CSP proof.
5. Vault lifecycle: setup, unlock, lock, refresh, inactivity, sign-out cleanup,
   passphrase change, and plaintext-leak verification.
6. Vault items: reviewed Prisma schema, ciphertext handlers, and one item type
   end-to-end before generalizing.
7. Workspace modules: projects and .env, then notes, then tasks.
8. Safety/productivity: local search, generator, reveal/copy UX, accessibility,
   encrypted export/import, and restore testing.
9. Hardening: CSP/headers, rate limits, dependency/XSS/cache/log reviews, and
   complete negative security tests.
10. Deployment readiness: isolated migration tests, environment and connection
    separation, HTTPS/headers, OAuth redirects, backups, and safe errors.

Do not start a later phase while an earlier security foundation is unresolved.

## Verification and quality

For each phase, run and report only relevant checks: npm run lint,
npm run build, focused tests once present, git diff --check, and manual browser
QA for visible behavior when available.

Security tests must eventually cover correct/wrong passphrases; corrupt
ciphertext, tags, nonces, AAD, owner, ID, type, and version; nonce uniqueness;
Unicode, empty, and maximum-size serialization; passphrase rewrap; lock,
refresh, inactivity, session loss, multi-tab, and sign-out; unauthorized
identities and IDOR; malformed/oversized API input; absence of plaintext from
traffic, HTML/RSC, Neon, logs, errors, URLs, cookies, browser storage, and
caches; XSS, Markdown, unsafe URLs, CSRF, CSP, headers; and encrypted export
restoration. Use synthetic fixtures only.

Prefer clear names, small functions, explicit types, and direct control flow.
Avoid any, unsafe casts, duplicated authorization, and hidden global state.
Comment why a security boundary exists, not what obvious code does. Preserve
keyboard access, focus, labels, contrast, reduced motion, touch targets, and
screen-reader feedback without announcing secret values.

## Non-negotiable invariants

1. Google authentication and vault unlocking remain separate.
2. Only verified Gmail identities may establish a V1 session.
3. Every protected operation authenticates, authorizes, validates, and enforces
   ownership server-side.
4. Browser-provided owner identifiers are never trusted.
5. The Vault Passphrase and plaintext KEK/DEK never leave the browser or persist.
6. Vault plaintext never reaches server code, Neon, logs, analytics, URLs,
   caches, or persistent browser storage.
7. User-authored private content is encrypted by default.
8. Every AES-GCM operation uses a fresh nonce and authenticated versioned data.
9. No custom cryptographic algorithm or casual format is permitted.
10. Refresh and lock discard unlocked state; sign-out cleans it before logout.
11. V1 has no server-side passphrase recovery or decryption bypass.
12. Search stays local with no plaintext mirrors.
13. Provider/database encryption never replaces client-side encryption.
14. Dependencies/scripts must not silently expand the trusted computing base.
15. No migration, destructive database action, production change, or deployment
    occurs without explicit approval.
16. No security property is claimed without tests and appropriate review.

## Final rule

When functionality conflicts with a security invariant, redesign the
functionality. Never work around the invariant for convenience.
