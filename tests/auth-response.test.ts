import assert from "node:assert/strict";
import test from "node:test";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { NextRequest } from "next/server";
import { getSafeAuthFailureType } from "../app/lib/auth/failure";
import { applyPrivateAuthHeaders } from "../app/lib/auth/response";

test("private auth headers preserve immutable Auth.js callback error redirects", async () => {
  const { handlers } = NextAuth({
    secret: "synthetic-test-secret-with-at-least-32-characters",
    trustHost: true,
    pages: { signIn: "/login", error: "/login" },
    providers: [Google({
      clientId: "fake-google-client",
      clientSecret: "fake-google-client-secret",
      authorization: "https://accounts.google.com/o/oauth2/v2/auth",
      token: "https://oauth2.googleapis.com/token",
      userinfo: "https://openidconnect.googleapis.com/v1/userinfo",
      checks: ["pkce", "state", "nonce"],
    })],
    logger: { error() {}, warn() {}, debug() {} },
  });
  const response = await handlers.GET(new NextRequest(
    "https://devstash.example.test/api/auth/callback/google?error=access_denied",
  ));

  assert.equal(response.status, 302);
  assert.throws(() => response.headers.set("Cache-Control", "no-store"), /immutable/i);

  const secured = applyPrivateAuthHeaders(response);
  assert.equal(secured.status, 302);
  assert.match(secured.headers.get("location") ?? "", /^https:\/\/devstash\.example\.test\/login\?error=/);
  assert.equal(secured.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.equal(secured.headers.get("referrer-policy"), "no-referrer");
});

test("private auth headers preserve response bodies and separate cookies", async () => {
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append("Set-Cookie", "first=synthetic; Path=/; HttpOnly");
  headers.append("Set-Cookie", "second=synthetic; Path=/; Secure");
  const response = new Response(JSON.stringify({ ok: true }), {
    status: 401,
    statusText: "Unauthorized",
    headers,
  });

  const secured = applyPrivateAuthHeaders(response);
  assert.equal(secured.status, 401);
  assert.equal(secured.statusText, "Unauthorized");
  assert.deepEqual(await secured.json(), { ok: true });
  assert.deepEqual(secured.headers.getSetCookie(), [
    "first=synthetic; Path=/; HttpOnly",
    "second=synthetic; Path=/; Secure",
  ]);
});

test("authentication failures retain only allowlisted request-local types", () => {
  assert.equal(getSafeAuthFailureType({ type: "OAuthCallbackError" }), "OAuthCallbackError");
  assert.equal(getSafeAuthFailureType({ type: "InvalidCheck" }), "InvalidCheck");
  assert.equal(getSafeAuthFailureType({ type: "provider-secret-leak" }), "UnknownAuthError");
  assert.equal(getSafeAuthFailureType(new Error("private provider response")), "UnknownAuthError");
});
