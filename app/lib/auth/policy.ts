import { z } from "zod";
import { AUTH_PROVIDER_ID, AUTH_ROUTES } from "./config";

// Google supplies additional OIDC claims; project-owned request contracts remain strict.
const googleIdentitySchema = z.object({
  sub: z.string().min(1).max(255),
  email: z.email().refine(isGmailAddress),
  email_verified: z.literal(true),
});

export function isGmailAddress(email: string) {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase() === "gmail.com";
}

export function approvedGoogleIdentity(
  profile: unknown,
  account: { provider: string; providerAccountId: string } | null | undefined,
) {
  const result = googleIdentitySchema.safeParse(profile);
  if (!result.success || account?.provider !== AUTH_PROVIDER_ID ||
    result.data.sub !== account.providerAccountId) {
    return null;
  }
  return result.data;
}

export function isVerifiedGmailUser(user: { email: string; emailVerified: Date | null }) {
  return isGmailAddress(user.email) && user.emailVerified instanceof Date &&
    Number.isFinite(user.emailVerified.valueOf());
}

export function matchesLinkedGoogleSubject(
  accounts: { provider: string; providerAccountId: string }[] | undefined,
  subject: string,
) {
  // Undefined means a new user. An existing unlinked email is denied.
  return accounts === undefined || accounts.some((account) =>
    account.provider === AUTH_PROVIDER_ID && account.providerAccountId === subject);
}

export function authenticationRedirect(url: string, origin: string) {
  // Login and logout are the only return destinations; caller input cannot open redirects.
  return url === AUTH_ROUTES.login || url === `${origin}${AUTH_ROUTES.login}`
    ? `${origin}${AUTH_ROUTES.login}`
    : `${origin}${AUTH_ROUTES.authenticatedHome}`;
}

export function isTrustedAuthRequest(request: Request, origin: string) {
  const expected = new URL(origin);
  const requestUrl = new URL(request.url);
  if (requestUrl.host !== expected.host || request.headers.get("host") !== expected.host) {
    return false;
  }
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost && forwardedHost !== expected.host) return false;
  const suppliedOrigin = request.headers.get("origin");
  if (request.method === "POST") return suppliedOrigin === origin;
  return suppliedOrigin === null || suppliedOrigin === origin;
}
