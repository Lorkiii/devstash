import "server-only";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { getPrisma } from "./prisma";
import { createAuthAdapter } from "./auth/adapter";
import { getAuthEnvironment } from "./auth/environment";
import { approvedGoogleIdentity, authenticationRedirect, matchesLinkedGoogleSubject } from "./auth/policy";
import { AUTH_ROUTES, AUTH_SESSION_POLICY } from "./auth/config";

export function createAuthConfig(onError: () => void = () => {}): NextAuthConfig {
  const environment = getAuthEnvironment();
  if (!environment) throw new Error("Authentication is not configured");
  const prisma = getPrisma(environment.databaseUrl);

  return {
    secret: environment.secret,
    trustHost: true, // API requests are checked against AUTH_URL before reaching Auth.js.
    useSecureCookies: environment.origin.startsWith("https:"),
    adapter: createAuthAdapter(prisma),
    session: {
      strategy: "database",
      maxAge: AUTH_SESSION_POLICY.maxAgeSeconds,
      updateAge: AUTH_SESSION_POLICY.updateAgeSeconds,
    },
    pages: { signIn: AUTH_ROUTES.login, error: AUTH_ROUTES.login },
    providers: [Google({
      clientId: environment.clientId,
      clientSecret: environment.clientSecret,
      authorization: { params: { scope: "openid email profile", prompt: "select_account" } },
      checks: ["pkce", "state", "nonce"],
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          emailVerified: profile.email_verified === true ? new Date() : null,
          name: null,
          image: null,
        };
      },
    })],
    callbacks: {
      async signIn({ account, profile }) {
        const identity = approvedGoogleIdentity(profile, account);
        if (!identity) return false;
        const existing = await prisma.user.findUnique({
          where: { email: identity.email },
          select: { accounts: { select: { provider: true, providerAccountId: true } } },
        });
        // Existing email must already belong to this exact Google subject.
        return matchesLinkedGoogleSubject(existing?.accounts, identity.sub);
      },
      session({ session, user }) {
        return { user: { id: user.id }, expires: session.expires };
      },
      redirect({ url }) {
        return authenticationRedirect(url, environment.origin);
      },
    },
    // Provider and adapter errors can embed tokens, URLs, and database details.
    logger: { error: onError, warn() {}, debug() {} },
    debug: false,
  };
}

export const { auth } = NextAuth(() => createAuthConfig());
