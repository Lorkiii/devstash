# DevStash

DevStash is a personal, client-encrypted workspace for developer secrets,
environment files, private notes, projects, and tasks. Google sign-in establishes
the user identity, while a separate Vault Passphrase unlocks encrypted data only
inside the browser.

> [!WARNING]
> DevStash is a security-learning project and has not received an independent
> security audit. Use synthetic data until the intended deployment, database,
> browser, and security reviews have been completed. Do not store important real
> credentials yet.

## Features

- Google-only sign-in for verified Gmail identities.
- A separately locked vault with setup, unlock, explicit lock, inactivity lock,
  lost-passphrase recovery, passphrase changes, and Recovery Phrase rotation.
- Encrypted Generic Secrets, Projects, complete `.env` bundles, Notes, Tasks,
  and custom task categories.
- Project relationships for secrets, environment bundles, notes, and tasks.
- Browser-local decrypted search through the command palette.
- Secure password generation using browser cryptographic randomness.
- Masked values, timed reveal, explicit copy, and best-effort clipboard clearing.
- Versioned encrypted backup export and all-or-nothing restore validation.
- Owner-scoped, ciphertext-only Route Handlers with strict validation, private
  cache controls, security headers, and abuse throttling.

## Security model

DevStash deliberately separates authentication from decryption:

```text
Google sign-in -> authenticated session -> locked vault
Vault Passphrase or Recovery Phrase -> local key derivation -> unlocked vault
```

Google authentication never unlocks the vault. Refreshing the page can preserve
the Auth.js session, but it discards the in-memory vault key and returns the user
to the locked state.

The optional account display name is an explicit plaintext-metadata exception:
it is stored in `User.name`, may appear in the authenticated shell while the
vault is locked, and must not contain secrets. It is not a login identifier,
unique public handle, or encrypted vault record. The verified Gmail address
remains the Google identity; Google-provided names and photos are not retained.

### Encryption boundary

- Vault plaintext, the Vault Passphrase, the Recovery Phrase, and plaintext key
  material are handled in the browser only.
- The Vault Passphrase derives a key-encryption key with Argon2id.
- A browser-generated 24-word English BIP-39 Recovery Phrase represents 256 bits
  of random entropy; HKDF-SHA-256 derives a separate recovery wrapping key.
- The passphrase key and recovery key independently wrap the same random 256-bit
  data-encryption key.
- Vault records use AES-256-GCM with a fresh 96-bit nonce and authenticated,
  versioned context for every encryption operation.
- The server and Neon store authentication data, approved relationship metadata,
  encryption settings, wrapped keys, nonces, and ciphertext—not vault plaintext.
- All private operations derive ownership from the authenticated server session;
  browser-supplied owner identifiers are not trusted.

The normal data path is:

```text
Write: plaintext -> browser encryption -> ciphertext API -> Neon
Read:  Neon -> ciphertext API -> browser decryption -> in-memory UI
```

Search also stays local: authorized ciphertext is fetched and decrypted in the
unlocked browser session, then indexed only in memory.

### Recovery and threat limits

DevStash has no server-side passphrase reset, escrow key, or decryption bypass.
The Recovery Phrase can recover the vault only after Google authentication and
must immediately be used to create a new passphrase wrapper. If both the Vault
Passphrase and Recovery Phrase are lost, the encrypted content is unrecoverable
through DevStash.

Client-side encryption reduces exposure from database snapshots, accidental
server plaintext handling, cross-user access, network observation under HTTPS,
and ciphertext tampering. It does not protect an unlocked vault from a
compromised device, malicious browser extension, keylogger, screen or clipboard
monitoring, XSS, compromised dependencies, or a malicious application build.
DevStash should not be described as zero-knowledge, audited, unbreakable, or
cryptographically erased.

## Technology stack

| Area | Technology |
| --- | --- |
| Application | Next.js 16 App Router, React 19, TypeScript |
| Styling | Tailwind CSS 4 and local reusable UI components |
| Authentication | Auth.js 5 with Google OAuth and database sessions |
| Database | Neon Postgres |
| ORM and validation | Prisma 7 and Zod 4 |
| Browser cryptography | Web Crypto, `libsodium-wrappers-sumo`, and `@scure/bip39` |
| Tests | Node.js test runner with TypeScript through `tsx` |

Security-sensitive packages are pinned in `package.json` and
`package-lock.json`. Use npm so the committed lockfile remains authoritative.

## Prerequisites

- Node.js 24 LTS and npm.
- A Neon Postgres project with separate pooled and direct connection strings.
- A Google Cloud OAuth web client configured for the environment where DevStash
  will run.

## Local setup

### 1. Install dependencies

```powershell
npm ci
npm run db:generate
```

### 2. Create the private environment file

Use `.env.example` as the variable reference:

```powershell
Copy-Item .env.example .env.local
```

Fill `.env.local` privately. Never commit it or paste its values into issues,
logs, screenshots, or chat.

| Variable | Purpose |
| --- | --- |
| `AUTH_URL` | Exact application origin, such as `http://localhost:3000` locally |
| `AUTH_SECRET` | Auth.js signing secret with at least 32 characters |
| `AUTH_GOOGLE_CLIENT_ID` | Google OAuth web client ID |
| `AUTH_GOOGLE_CLIENT_SECRET` | Google OAuth web client secret |
| `DATABASE_URL` | Pooled Neon URL used by application traffic |
| `DIRECT_URL` | Direct Neon URL used by Prisma CLI and administrative work |
| `DEVSTASH_CSP_MODE` | CSP mode; keep `report-only` until deployment review approves enforcement |

Generate the Auth.js secret directly into the local environment without
printing it:

```powershell
npx auth secret
```

Changing `AUTH_SECRET` later invalidates existing sessions. None of the private
variables may use a `NEXT_PUBLIC_` prefix.

### 3. Configure Google OAuth

Create an External OAuth consent screen and a Web application client in Google
Auth Platform. Request only the `openid`, `email`, and `profile` identity scopes.
While the app remains in Testing, add every developer or tester under the OAuth
test audience.

For the default local origin, register:

```text
Authorized JavaScript origin: http://localhost:3000
Authorized redirect URI:      http://localhost:3000/api/auth/callback/google
```

`AUTH_URL`, the browser origin, and the Google OAuth configuration must match
exactly. Production requires the deployed HTTPS origin and its corresponding
`/api/auth/callback/google` redirect URI.

DevStash accepts verified `@gmail.com` identities only. Each account is bound to
Google's stable provider subject, and an existing email cannot be silently
linked to a different Google identity.

### 4. Prepare the database

The repository contains migrations for authentication, the vault encryption
profile, vault items, and encrypted workspace modules. First inspect the target
and migration status without modifying the database:

```powershell
npx --no-install prisma migrate status
```

Before applying anything, confirm the intended Neon project, branch, database,
and schema, then review the SQL under `prisma/migrations/`. Test migrations on an
isolated Neon branch. Only an authorized operator should apply them to the
confirmed target:

```powershell
npx prisma migrate deploy
```

`npm run db:generate`, `npm run db:validate`, and `npm run build` do not apply
migrations. Prisma records applied migrations in the database's
`_prisma_migrations` table.

### 5. Start DevStash

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Successful Google sign-in
opens the authenticated dashboard in the locked state. A first-time user creates
the Vault Passphrase and receives the browser-generated Recovery Phrase during
local vault setup.

If authentication variables are missing or invalid, Google sign-in is disabled
and protected routes redirect to `/login`.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Next.js development server |
| `npm run build` | Generate the Prisma client and create a production build |
| `npm run start` | Run the previously built production server |
| `npm test` | Run the synthetic unit and security regression suite |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate the Prisma client without changing the database |
| `npm run db:validate` | Validate the Prisma schema without applying migrations |
| `npm run check:deployment` | Run offline repository and environment-contract checks |
| `npm run test:crypto:browser:build` | Build the standalone browser crypto proof |
| `npm run test:crypto:browser:serve` | Serve the built browser crypto proof locally |

The deployment checker does not load `.env`, contact Neon or Google, apply
migrations, or prove that a deployment works.

## Project structure

```text
app/
  (app)/                 authenticated pages mounted only after vault unlock
  api/                   authenticated handlers; vault CRUD is ciphertext-only
  components/
    <feature>/           page-specific UI grouped by feature
    ui/                  reusable, page-agnostic primitives
  lib/
    auth/                Google identity, session, and authorization boundary
    security/            CSP and shared security headers
    vault-crypto/        browser-only encoding, KDF, wrapping, and encryption
    vault-profile/       ciphertext profile validation and persistence
    vault-items/         owner-scoped encrypted item persistence
    workspace/           owner-scoped project, env, note, and task persistence
    vault-backup/        ciphertext snapshot and atomic restore persistence
prisma/
  migrations/            reviewed SQL migrations
  schema.prisma          application data model
scripts/                 offline repository and release checks
tests/                   synthetic unit, boundary, and negative-security tests
```

Keep route files focused on composition or HTTP handling. Feature components may
depend on shared UI and library modules; shared UI must not import page features,
and library code must not import components. Promote a component into
`app/components/ui/` only after it is genuinely shared.

Browser cryptography and plaintext types must not be imported into Server
Components or Route Handlers. Server-side persistence modules remain
ciphertext-only and enforce ownership close to the data layer. Component props
and supporting types live in adjacent `*.types.ts` files when needed.

Before changing Next.js behavior, read the installed version's relevant guide
under `node_modules/next/dist/docs/`; this repository may differ from older
Next.js conventions.

## Verification

Run the relevant checks before review:

```powershell
npm test
npm run lint
npm run db:validate
npm run check:deployment
npm run build
git diff --check
```

The automated suite uses synthetic identities and data. It covers authentication
policy, ownership and request boundaries, vault cryptographic primitives and
lifecycle, ciphertext validation, workspace encryption, local search, password
generation, backup integrity, CSP, caching, and source-boundary regressions.

Passing these checks does not prove a live Google OAuth exchange, Neon
connectivity, applied migration state, production headers, real-browser vault
behavior, Safari compatibility, rate limits across deployed instances, backup
recovery against production data, or an independent security audit.

## Deployment checklist

Deployment and production database changes require explicit operator approval.
For a candidate release:

1. Confirm the exact hosting origin and configure all server-only variables in
   the host's encrypted secret store.
2. Register the matching HTTPS origin and Google callback URI.
3. Test every pending migration on an isolated Neon branch before applying it to
   the intended target.
4. Run the complete verification suite against the exact release revision.
5. Deploy with `DEVSTASH_CSP_MODE=report-only` and verify HTTPS, HSTS, security
   headers, redacted logs, safe errors, and trusted-source rate limits.
6. Exercise authentication, vault lifecycle, encrypted CRUD, local search,
   backup export, deletion, and restore in supported browsers, including Safari
   on real Apple hardware.
7. Enable CSP enforcement only after reviewing the collected evidence and
   confirming a rollback path.

Never store infrastructure credentials inside DevStash itself, expose database
URLs to browser code, or use a pooled connection for migrations and other
administrative work.

## Development guardrails

Read [`AGENTS.md`](AGENTS.md) before changing the repository. It contains the
authoritative security invariants, scope boundaries, and verification rules.
In particular:

- Keep Google authentication and vault unlocking separate.
- Never send or persist vault plaintext, passphrases, Recovery Phrases, or
  plaintext keys outside ephemeral browser memory.
- Authenticate, authorize, validate, and enforce ownership for every protected
  server operation.
- Keep search local and user-authored private content encrypted by default.
- Do not add third-party scripts, cryptography, authentication providers, or
  plaintext metadata without explicit architecture review.
- Do not deploy, change production configuration, or apply database migrations
  without explicit authorization.
- Report only checks that were actually run; static checks are not browser or
  production verification.
