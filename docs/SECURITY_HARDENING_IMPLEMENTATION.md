# Security hardening implementation

**Phase:** 9 of 10
**Evidence date:** 2026-09-13
**Status:** implemented locally; production observation, authenticated browser QA, and database-backed gates remain open

Phase 9 hardens the existing authenticated, ciphertext-only application. It adds
no plaintext server contract, cryptographic format, dependency, Prisma model, or
database migration. No migration, seed, reset, Neon mutation, deployment, or
production configuration change was performed.

## Content Security Policy and headers

The root `proxy.ts` follows the installed Next.js 16.3.4 nonce pattern. Every
matched document request receives a fresh 128-bit nonce in the internal
`Content-Security-Policy` request header so Next.js can nonce its framework
output. The browser-facing header is selected by the server-only
`DEVSTASH_CSP_MODE` setting:

- Any missing or unrecognized value stays `report-only`.
- The exact value `enforce` emits `Content-Security-Policy`.
- Development alone permits Next.js's required `unsafe-eval` and inline-style
  exceptions. Production permits neither `unsafe-eval` nor `unsafe-inline`.

The production policy keeps scripts, workers, connections, fonts, and images
self-hosted; allows `wasm-unsafe-eval` only for the reviewed Argon2id WebAssembly
implementation; and denies style attributes, media, objects, frames, embedding,
base URL changes, and cross-origin form submissions. All routes render
dynamically so a cached static document cannot reuse a nonce.

Phase 9 removes every React `style` attribute and runtime `element.style`
assignment. Decorative landing styles now live in `app/globals.css`. The vault
type distribution uses a semantic `<progress>` element with static CSS instead
of an interpolated inline width.

Global responses now set `Cross-Origin-Opener-Policy: same-origin`,
`Cross-Origin-Resource-Policy: same-origin`, a restrictive Permissions Policy,
`Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, DNS prefetch
off, and frame denial. Private pages and all API responses receive a `no-store`
backstop; private pages also receive `X-Robots-Tag: noindex, nofollow, noarchive`.
HSTS is intentionally deferred until Phase 10 verifies the final HTTPS origin
and domain policy.

## Abuse controls

The existing database-backed fixed-window limiter is now a shared server-only
primitive. Authentication retains its global start/callback buckets without
persisting IP addresses. The expensive encrypted backup endpoint adds two
owner-scoped buckets in the already-applied `AuthRateLimit` table:

- Snapshot/export: 12 requests per hour per authenticated owner.
- Restore: 5 requests per hour per authenticated owner.

Authentication and exact origin checks run before the restore limiter. The
limit runs before the 32 MiB body is read or any replace transaction begins.
Exhausted buckets return `429`, `Retry-After`, and `no-store`. A limiter/database
failure fails closed through the endpoint's existing generic error path. No
browser-supplied owner identifier or forwarded IP is trusted.

Other ciphertext CRUD mutations retain authentication, trusted-origin checks,
strict bounded bodies, owner-scoped data access, and small per-record limits.
General edge/source throttling belongs to the final deployment review because
it requires a trustworthy hosting boundary.

## XSS, cache, dependency, and log review

The application contains no `dangerouslySetInnerHTML`, DOM HTML assignment,
dynamic code evaluation, runtime inline style, remote runtime script, or
server-side vault-body logging path. Private text continues to use React text
rendering; private URL fields are displayed as text rather than opened as
unreviewed links. Notes are plain text and no Markdown/HTML renderer is present.

Next.js incoming request logging now ignores all `/api` paths, covering OAuth
query strings and private record identifiers. Application code contains no
`console` call. Private DTO helpers and Auth.js responses continue to set
`no-store`; the Next.js header rule also covers framework-generated API errors.

`npm ls --all --omit=optional` reviewed the resolved tree. Security-sensitive
direct dependencies remain exactly pinned and self-hosted. `npm audit --json`
reported zero known vulnerabilities across 607 production, development,
optional, and peer dependency entries. No dependency was added or updated in
Phase 9. This advisory result is time-specific and is not an independent audit.

## Negative-test matrix

The local synthetic suite now adds regression coverage for:

- Production/development CSP directives, nonce input rejection, and the
  report-only-to-enforce gate.
- Missing/cross-origin origins, direct host confusion, and forwarded-host
  confusion.
- Wrong content types, declared and streamed body overflow, malformed UTF-8,
  and invalid JSON.
- Private `no-store` responses, security headers, rate-limit owner/action
  isolation, `429`, and `Retry-After`.
- Source-level HTML injection, dynamic evaluation, inline style, logging, and
  persistent browser-storage sinks.

These tests join the existing negative vectors for Gmail/Google subject policy,
redirects, sessions, CSRF logout, wrappers, tags, nonces, AAD owner/ID/type/
relationship/version binding, payload drift, UTF-8 bounds, strict ciphertext
contracts, local search, and complete encrypted-backup authentication.

## Verification and remaining gates

Current local checks:

- `npm audit --json` passed with zero reported vulnerabilities.
- `npm test` passed all 68 tests.
- `npm run lint` passed.
- `npm run db:validate` passed without connecting to or changing Neon.
- `npm run build` passed and emitted every page dynamically with
  the Next.js Proxy active.
- `npm run test:crypto:browser:build` passed after granting the existing
  esbuild cache access required on this Windows environment.
- A local production server emitted fresh 16-byte nonces; all 10 landing-page
  framework script tags had the matching nonce and the response contained no
  inline style attribute.
- Headless Chrome rendered the landing and sign-in pages under enforced
  production CSP with zero CSP refusal/violation lines and zero browser errors.
- `git diff --check` passed; dedicated untracked-file whitespace and
  conflict-marker checks also passed.

The available Computer Use environment exposed no controllable browsers, so no
manual screenshot, responsive, keyboard, focus, or screen-reader claim is made.
Headless public-page rendering does not prove authenticated setup, unlock,
recovery, rotation, worker execution in the real Next.js application, timed
reveal, clipboard permissions, multi-tab locking, CRUD, or backup restore.

Phase 10 must deploy the exact policy in report-only mode first, review real
production violations without logging private URLs or inputs, exercise every
authenticated vault flow in supported browsers (including real Safari hardware),
and only then set `DEVSTASH_CSP_MODE=enforce`. It must also verify HTTPS/HSTS,
hosting access-log redaction, trusted proxy/source rate limiting, the pending
migrations on an isolated Neon branch, database-backed IDOR and rollback cases,
and a complete encrypted export-delete-restore exercise. DevStash remains
restricted to synthetic secrets until those gates and independent review are
complete.
