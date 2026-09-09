# Google authentication architecture review

Reviewed for the user-requested authentication task on 2026-09-09 against
AGENTS.md, the installed Next.js authentication guide, and the upstream sources
below. This is an implementation review, not an independent security audit.

## Scope and boundary

Implement Google identity and revocable database sessions only. The existing
preview accepts an arbitrary passphrase and loads synthetic records. Remove
that unlock path from the authenticated application: every session starts and
stays locked, with no passphrase input, until the separate cryptographic proof
and vault lifecycle phases are implemented. No vault payloads, key formats,
recovery mechanism, or plaintext content columns are introduced here.

The existing security policy defines the threat model, encrypted metadata
boundary, and no-recovery rule. KDF selection, supported-browser benchmarks,
envelope vectors, and production CSP proof remain prerequisites for implementing
cryptography. Authentication cannot imply those protections already exist.

## Decisions

- Use Auth.js's Next.js v5 integration, pinned to 5.0.0-beta.32, with its Prisma
  adapter 2.11.3. Both use @auth/core 0.41.3; the Next.js package declares support
  for Next.js 16 and React 19. The v5 integration is still a prerelease. Retain
  the project's explicit Auth.js choice; dependency updates require review.
- Use Prisma 7.10.0 (the current non-prerelease line), its matching Neon adapter,
  and Zod 4.5.4. Node 24.18.0 is installed. Inspect the resolved dependency tree,
  run the package advisory check, and verify compilation after installation.
- Prisma's CLI brought advisory-affected development dependencies. Reviewed
  targeted overrides pin @prisma/config's deepmerge-ts to 8.0.2 and Prisma's
  mysql2 to 3.24.4. Prisma uses deepmerge's existing exported function; this
  repository's static config does not use recursive input. Generation and schema
  validation verify that config loading still works. The full npm audit after
  these overrides reports no known vulnerabilities; this is not a security audit.
- Google is the only provider. Request openid, email, and profile identity scopes
  with PKCE and state. Use Auth.js's validated OIDC result, never submitted email
  or owner fields. Require email_verified === true, an `@gmail.com` address, and
  a nonempty subject matching providerAccountId.
- Pin the first accepted Google subject through Account's unique provider/subject
  relation. Refuse a different subject for an existing email; never enable
  dangerous email-based account linking. Recheck the verified Gmail status and
  linked Google identity on session reads.
- Use database sessions with HTTP-only, same-site cookies; secure cookies require
  HTTPS outside localhost development. Delete the database session on logout.
  No Google access, refresh, or ID tokens are retained in the database or returned
  to the browser. No remote Google avatar or UI script is loaded.
- Fix the callback origin using server configuration. Reject untrusted request
  origins/hosts, retain Auth.js CSRF protection, and restrict post-login redirects
  to /dashboard and logout to /login. Do not accept user-provided return URLs.
- Apply a database-backed rate limit to OAuth starts and callbacks. Its policy is
  separate from a Prisma repository that uses conditional writes; no raw SQL is
  embedded in authentication policy. The initial global limits avoid storing IP
  addresses or trusting forwarded-IP headers; this trades shared availability
  under deliberate flooding for bounded authentication work. Review an edge or
  trustworthy per-source limit before opening a production deployment broadly.
- Use server-only shared session authorization, an authenticated layout, and a
  fresh check in each private route. Client gates are UX only. Future ciphertext
  services must authenticate and scope queries by the verified user ID themselves.
- Return only a user ID and session expiry to the client. Authentication responses
  and protected pages use no-store. Suppress provider/adapter diagnostic payloads;
  failures receive fixed public messages. Missing configuration fails closed.

## Reviewed persistence

Only authentication tables are proposed: User (ID, unique verified Gmail address,
verification timestamp, nullable unused name/image for adapter compatibility),
Account (owner, Google provider, stable subject, type; unique provider/subject
  and owner/provider), Session (opaque token, owner, expiry), and AuthRateLimit
(fixed action ID, window start, count). Foreign keys cascade on user deletion.
  OAuth tokens, vault passphrases, keys, and private workspace content have no
  columns. Token columns are omitted by an explicit adapter linkAccount override.

Runtime uses the pooled DATABASE_URL. Prisma CLI uses a separate DIRECT_URL.
Local schema generation/validation and migration SQL preparation do not apply
a migration. Provisioning and applying migrations require separate explicit
authorization, first against an isolated Neon branch.

## Verification and remaining setup

Use synthetic identities for Gmail domain, unverified/missing claims, subject
changes, ownership, safe redirects, origin, session rejection, and throttle
tests. Run lint, build, schema validation, and diff checks. Check signed-out
navigation and safe failure behavior in the browser when available.

Real OAuth success, database session deletion/revocation, and migration execution
require the user's separately configured Google OAuth application and isolated
database. Never request credentials in chat. Record exactly which checks run.

## Sources

- [Auth.js installation](https://authjs.dev/getting-started/installation)
- [Auth.js Prisma adapter](https://authjs.dev/getting-started/adapters/prisma)
- [Auth.js Google provider](https://authjs.dev/getting-started/providers/google)
- [Google OpenID Connect identity claims](https://developers.google.com/identity/openid-connect/openid-connect)
- [Prisma database connections](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections)
- Installed Next.js docs: node_modules/next/dist/docs/01-app/02-guides/authentication.md
