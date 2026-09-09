import assert from "node:assert/strict";
import test from "node:test";
import NextAuth from "next-auth";
import { NextRequest } from "next/server";
import type { Adapter, AdapterAccount, AdapterSession, AdapterUser } from "next-auth/adapters";
import { restrictAuthAdapter } from "../app/lib/auth/adapter";
import { createAuthConfig } from "../app/lib/auth";
import { getAuthEnvironment } from "../app/lib/auth/environment";

// Synthetic configuration only. No connection is made by these adapter tests.
process.env.AUTH_SECRET = "synthetic-test-secret-with-at-least-32-characters";
process.env.AUTH_URL = "https://devstash.example.test";
process.env.AUTH_GOOGLE_CLIENT_ID = "fake-google-client";
process.env.AUTH_GOOGLE_CLIENT_SECRET = "fake-google-client-secret";
process.env.DATABASE_URL = "postgresql://fake:fake@localhost:5432/fake";

function fixture() {
  let user: AdapterUser = {
    id: "owner-id", email: "owner@gmail.com", emailVerified: new Date(), name: null, image: null,
  };
  let session: AdapterSession | null = {
    sessionToken: "synthetic-session-token", userId: user.id, expires: new Date(Date.now() + 86400_000),
  };
  let linkedAccount: { providerAccountId: string; type: string } | null = {
    providerAccountId: "google-subject-1", type: "oidc",
  };
  const savedAccounts: AdapterAccount[] = [];
  const lookedUpOwners: string[] = [];
  const base: Adapter = {
    async createUser(value) { user = { ...value, id: "owner-id" }; return user; },
    async getUser() { return user; },
    async getUserByEmail() { return user; },
    async getUserByAccount() { return user; },
    async updateUser() { return user; },
    async createSession() { throw new Error("Unexpected session creation"); },
    async getSessionAndUser(token) { return session?.sessionToken === token ? { user, session } : null; },
    async updateSession() { return session; },
    async deleteSession() { const deleted = session; session = null; return deleted; },
    async linkAccount(value) { savedAccounts.push(value); },
  };
  const adapter = restrictAuthAdapter(base, async (userId) => {
    lookedUpOwners.push(userId);
    return linkedAccount;
  });
  return {
    adapter, savedAccounts, lookedUpOwners,
    setUser(value: AdapterUser) { user = value; },
    removeAccount() { linkedAccount = null; },
    expire() { if (session) session.expires = new Date(0); },
  };
}

test("account persistence strips all Google bearer tokens", async () => {
  const state = fixture();
  await state.adapter.linkAccount?.({
    userId: "owner-id", provider: "google", type: "oidc", providerAccountId: "google-subject-1",
    access_token: "fake-access", refresh_token: "fake-refresh", id_token: "fake-id", scope: "openid email profile",
  });
  assert.deepEqual(state.savedAccounts, [{
    userId: "owner-id", provider: "google", type: "oidc", providerAccountId: "google-subject-1",
  }]);
  await assert.rejects(async () => state.adapter.linkAccount?.({
    userId: "owner-id", provider: "github", type: "oauth", providerAccountId: "other",
  }));
});

test("verified Gmail users survive Auth.js clearing emailVerified during OAuth creation", async () => {
  const state = fixture();
  const user = await state.adapter.createUser?.({
    id: "temporary-id", email: "owner@gmail.com", emailVerified: null,
    name: "Unneeded display name", image: "https://unneeded.example.test/avatar",
  });
  assert.ok(user?.emailVerified instanceof Date);
  assert.equal(user?.name, null);
  assert.equal(user?.image, null);
  assert.equal((await state.adapter.getSessionAndUser?.("synthetic-session-token"))?.user.id, "owner-id");
  await assert.rejects(async () => state.adapter.createUser?.({
    id: "unapproved", email: "other@example.test", emailVerified: new Date(),
  }));
});

test("session ownership is read from persistence, and invalid stored identity denies access", async () => {
  const state = fixture();
  assert.equal((await state.adapter.getSessionAndUser?.("synthetic-session-token"))?.user.id, "owner-id");
  assert.deepEqual(state.lookedUpOwners, ["owner-id"]);
  assert.equal(await state.adapter.getSessionAndUser?.("attacker-token"), null);
  state.setUser({ id: "attacker-id", email: "other@example.test", emailVerified: new Date() });
  assert.equal(await state.adapter.getSessionAndUser?.("synthetic-session-token"), null);
  state.setUser({ id: "owner-id", email: "owner@gmail.com", emailVerified: null });
  assert.equal(await state.adapter.getSessionAndUser?.("synthetic-session-token"), null);
  state.setUser({ id: "owner-id", email: "owner@gmail.com", emailVerified: new Date() });
  state.removeAccount();
  assert.equal(await state.adapter.getSessionAndUser?.("synthetic-session-token"), null);
});

function authHandlers(adapter: Adapter) {
  return NextAuth({ ...createAuthConfig(), adapter }).handlers;
}

const request = (action: string, token?: string) => new NextRequest(`https://devstash.example.test/api/auth/${action}`, {
  headers: token ? { cookie: `__Secure-authjs.session-token=${token}` } : {},
});

test("Auth.js session endpoint exposes only ID and expiry and rejects forged, expired, or revoked tokens", async () => {
  const state = fixture();
  const handlers = authHandlers(state.adapter);
  const response = await handlers.GET(request("session", "synthetic-session-token"));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(Object.keys(payload).sort(), ["expires", "user"]);
  assert.deepEqual(payload.user, { id: "owner-id" });
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly/i);
  assert.match(response.headers.get("set-cookie") ?? "", /Secure/i);
  assert.match(response.headers.get("set-cookie") ?? "", /SameSite=Lax/i);
  assert.equal(await (await handlers.GET(request("session", "forged-token"))).json(), null);
  state.expire();
  assert.equal(await (await handlers.GET(request("session", "synthetic-session-token"))).json(), null);
  assert.equal(await state.adapter.getSessionAndUser?.("synthetic-session-token"), null);
});

test("Auth.js signout requires CSRF and deletes the database session with a valid CSRF token", async () => {
  const state = fixture();
  const handlers = authHandlers(state.adapter);
  const post = (body: URLSearchParams, cookie: string) => new NextRequest("https://devstash.example.test/api/auth/signout", {
    method: "POST", headers: { cookie, "content-type": "application/x-www-form-urlencoded", "x-auth-return-redirect": "1" }, body,
  });
  const sessionCookie = "__Secure-authjs.session-token=synthetic-session-token";
  await handlers.POST(post(new URLSearchParams({ callbackUrl: "/login" }), sessionCookie));
  assert.ok(await state.adapter.getSessionAndUser?.("synthetic-session-token"));
  const csrf = await handlers.GET(request("csrf"));
  const { csrfToken } = await csrf.json();
  const cookies = csrf.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  const result = await handlers.POST(post(new URLSearchParams({ csrfToken, callbackUrl: "/login" }), `${sessionCookie}; ${cookies}`));
  assert.equal(result.status, 200);
  assert.equal(await state.adapter.getSessionAndUser?.("synthetic-session-token"), null);
  assert.equal((await result.json()).url, "https://devstash.example.test/login");
});

test("configuration fails closed when a required server secret is missing", () => {
  assert.ok(getAuthEnvironment());
  const previous = process.env.AUTH_GOOGLE_CLIENT_SECRET;
  delete process.env.AUTH_GOOGLE_CLIENT_SECRET;
  assert.equal(getAuthEnvironment(), null);
  process.env.AUTH_GOOGLE_CLIENT_SECRET = previous;
});
