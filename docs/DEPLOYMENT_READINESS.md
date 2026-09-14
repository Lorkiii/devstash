# Deployment readiness

**Phase:** 10 — deployment readiness
**Status:** repository checks implemented; external release gates remain pending

This phase prepares a release without deploying it. The repository does not
contain production secrets, does not connect to Neon, and does not apply any
Prisma migration.

## Offline gate

Run these checks from the repository root:

```powershell
npm run check:deployment
npm test
npm run lint
npm run db:validate
npm run build
git diff --check
```

`check:deployment` validates the server-only environment contract, pooled versus
direct database URL wiring, the committed lockfile and migration lock, and the
report-only CSP default. It never loads `.env`, contacts a provider, or prints
environment values. To validate a candidate HTTPS origin without storing it,
set `DEVSTASH_DEPLOYMENT_ORIGIN` for the command; the check only verifies its
shape and prints the expected Google callback reminder.

## Release sequence requiring explicit operator approval

1. Create or select the intended Vercel project and configure the production
   HTTPS origin. Set `DATABASE_URL` to the pooled Neon URL and `DIRECT_URL` to
   the separate direct URL. Set Auth.js and Google credentials only in the
   hosting secret store.
2. Register the exact `${AUTH_URL}/api/auth/callback/google` URI and matching
   JavaScript origin in Google Auth Platform. Keep the OAuth scope set to
   `openid email profile` and verify the Gmail test audience.
3. Test every pending migration on a fresh isolated Neon branch. Inspect the
   generated SQL, verify `_prisma_migrations`, run database-backed ownership,
   rollback, and concurrency checks, and record the branch and schema. Only
   after that review may an operator approve `prisma migrate deploy` against
   the intended target.
4. Deploy the exact build with `DEVSTASH_CSP_MODE=report-only`. Confirm HTTPS,
   HSTS, security headers, redacted hosting logs, safe error responses, and
   trusted source/edge rate limits. Collect CSP reports without private URLs,
   request bodies, or credentials.
5. Exercise first-login, returning-login, sign-out, session revocation, setup,
   unlock, lock, refresh, inactivity, recovery, passphrase change, Recovery
   Phrase rotation, CRUD, local search, backup export, delete, and restore in
   each supported browser. Include real Safari hardware and verify worker/KDF
   behavior under the deployed CSP.
6. Review the evidence and only then change the production setting to
   `DEVSTASH_CSP_MODE=enforce`. Keep a rollback plan that changes the setting,
   not the encryption or authorization boundaries.

## Explicitly not done here

No Vercel project, DNS, OAuth client, Neon branch, production environment,
migration, backup, or real-user browser session was changed. The app remains a
synthetic-data security-learning project until the external gates above and an
independent review are complete.
