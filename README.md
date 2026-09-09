DevStash is an individual developer workspace with Gmail sign-in and a separately
locked, private vault for each user. Authentication is implemented; client-side
encryption and real vault setup/unlock are still pending. Use synthetic data only.

## Google sign-in setup

1. Use Node.js 24 LTS and run `npm ci`, then `npm run db:generate`.
2. Use `.env.example` as the variable reference and fill the values privately.
   This workspace may already keep Neon URLs in `.env`; add the auth values to
   that file, or move every value to `.env.local`. Do not leave blank duplicates
   in `.env.local`, because it takes precedence over `.env`. Never commit either
   private environment file or paste its values into chat.
3. In [Google Auth Platform](https://console.cloud.google.com/auth/overview),
   configure an **External** OAuth consent screen and a **Web application** OAuth
   client. While the app is in Testing, add each developer/test account under
   Audience > Test users. Publish the OAuth app before expecting unlisted Gmail
   users to sign in. Request only the `openid`, `email`, and `profile` scopes.
4. For local development, register `http://localhost:3000` as an authorized
   JavaScript origin and register the exact redirect URI
   `http://localhost:3000/api/auth/callback/google`. Use
   `AUTH_URL=http://localhost:3000`. A different port or hostname requires
   matching entries. Production requires the deployed HTTPS origin and its exact
   `/api/auth/callback/google` redirect URI.
5. Fill `AUTH_GOOGLE_CLIENT_ID` and `AUTH_GOOGLE_CLIENT_SECRET` from that OAuth client. Any
   verified `@gmail.com` identity may create its own account. Each account is
   bound to Google's stable subject, and an existing email cannot be linked to a
   different Google identity.
6. Generate `AUTH_SECRET` locally without printing it. Auth.js can create it in
   the local environment file with:

   ```powershell
   npx auth secret
   ```

   Run it once and keep the generated value private. Changing it later
   invalidates existing Auth.js sessions.

7. Configure `DATABASE_URL` with the **pooled** Neon URL and `DIRECT_URL` with the
   separate **direct** URL. Neither may use a `NEXT_PUBLIC_` prefix. The runtime
   uses only the pooled connection; Prisma CLI reads only the direct connection.
8. Review `prisma/migrations/20260909000000_google_auth/migration.sql`. It creates
   authentication tables only. It was validated on an isolated Neon branch and
   applied to the configured production branch on 2026-09-09. For another
   environment, approve its target and apply it with `npx prisma migrate deploy`.
9. Run `npm run dev`, visit `/login`, and choose a verified Gmail account.
   Successful sign-in opens `/dashboard` locked. The header's sign-out control
   clears local vault state and deletes the database session before navigation.

Missing configuration disables sign-in and protected routes redirect to `/login`.
Sign-in never accepts a vault passphrase or unlocks data. The earlier simulated
unlock has been removed from the authenticated flow.

### Where the authentication tables are defined

- `prisma/schema.prisma` describes the Prisma models.
- `prisma/migrations/20260909000000_google_auth/migration.sql` contains the SQL
  for `User`, `Account`, `Session`, and `AuthRateLimit`.
- `app/generated/prisma/` contains generated client code, not database tables.

`npm run db:generate` and `npm run build` do not apply migrations. Prisma records
applied migrations in the database's `_prisma_migrations` table.

`prisma.config.ts` loads the local environment and targets `DIRECT_URL`; the
application uses `DATABASE_URL`. Check the intended Neon project, branch,
database, and schema before approving any migration. To check status without
changing the database, run `npx --no-install prisma migrate status`.

## Verification

```powershell
npm test
npm run lint
npm run db:validate
npm run build
git diff --check
```

Tests use synthetic identities and an in-memory Auth.js adapter fixture. They
cover Gmail-only verified claims, stable subject binding, token-free
account persistence, session ownership, safe redirects, request origin checks,
minimal session responses, cookie flags, expiration, revocation, and CSRF logout.
They do not connect to Neon or perform a live Google OAuth exchange.

Before enabling real use, verify first/returning Gmail login, denied non-Gmail identities,
session deletion and revocation against the isolated database, concurrency and
reset of the database rate limiter, cancellation/error UX, refresh, and sign-out
across tabs. The polling interval is 60 seconds with focus revalidation; it is
not instant cross-device revocation of already-rendered UI. Each server route
revalidates authorization. Vault unlocking remains disabled.

Read [the authentication architecture review](docs/AUTHENTICATION_ARCHITECTURE.md)
for the trust boundaries, dependency decisions, and remaining cryptographic work.
Hosting access logs must redact OAuth callback query strings. Next.js development
request logging excludes `/api/auth` and Auth.js diagnostic payloads are suppressed.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
