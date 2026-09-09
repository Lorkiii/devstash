import "server-only";
import type { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { createAuthConfig } from "@/app/lib/auth";
import { getPrisma } from "@/app/lib/prisma";
import { AUTH_ACTIONS, AUTH_RESPONSE_POLICY } from "./config";
import { getAuthEnvironment } from "./environment";
import { isTrustedAuthRequest } from "./policy";
import { allowAuthAttempt, getRateLimitedAuthAction } from "./rate-limit";
import { createAuthRateLimitRepository } from "./rate-limit-repository";

function applyPrivateHeaders(response: Response) {
  response.headers.set("Cache-Control", AUTH_RESPONSE_POLICY.cacheControl);
  response.headers.set("Referrer-Policy", AUTH_RESPONSE_POLICY.referrerPolicy);
  return response;
}

function authenticationFailure(status: number) {
  return applyPrivateHeaders(Response.json(
    { error: AUTH_RESPONSE_POLICY.unavailableMessage },
    { status },
  ));
}

export async function handleAuthRequest(request: NextRequest) {
  const environment = getAuthEnvironment();
  if (!environment) return authenticationFailure(AUTH_RESPONSE_POLICY.status.unavailable);
  if (!isTrustedAuthRequest(request, environment.origin)) {
    return authenticationFailure(AUTH_RESPONSE_POLICY.status.forbidden);
  }

  try {
    const prisma = getPrisma(environment.databaseUrl);
    const action = getRateLimitedAuthAction(request.nextUrl.pathname);
    if (action && !await allowAuthAttempt(createAuthRateLimitRepository(prisma), action)) {
      const response = authenticationFailure(AUTH_RESPONSE_POLICY.status.tooManyRequests);
      response.headers.set("Retry-After", String(AUTH_RESPONSE_POLICY.retryAfterSeconds));
      return response;
    }

    // Preserve the session cookie if database logout fails so logout can be retried.
    let authFailed = false;
    const { handlers } = NextAuth(createAuthConfig(() => { authFailed = true; }));
    const response = await handlers[request.method === "POST" ? "POST" : "GET"](request);
    const isSignOut = request.nextUrl.pathname.endsWith(`/${AUTH_ACTIONS.signOut}`);
    if (authFailed && isSignOut) {
      return authenticationFailure(AUTH_RESPONSE_POLICY.status.unavailable);
    }
    return applyPrivateHeaders(response);
  } catch {
    return authenticationFailure(AUTH_RESPONSE_POLICY.status.unavailable);
  }
}
