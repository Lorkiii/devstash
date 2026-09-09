import assert from "node:assert/strict";
import test from "node:test";
import {
  approvedGoogleIdentity, authenticationRedirect, isTrustedAuthRequest,
  matchesLinkedGoogleSubject,
} from "../app/lib/auth/policy";

const email = "owner@gmail.com";
const profile = { sub: "google-subject-1", email, email_verified: true };
const account = { provider: "google", providerAccountId: profile.sub };

test("verified Gmail identities with matching Google subjects are accepted", () => {
  assert.equal(approvedGoogleIdentity(profile, account)?.sub, profile.sub);
  const otherProfile = {
    ...profile,
    sub: "google-subject-2",
    email: "another.user@gmail.com",
  };
  assert.equal(approvedGoogleIdentity(otherProfile, {
    provider: "google",
    providerAccountId: otherProfile.sub,
  })?.email, otherProfile.email);

  for (const invalid of [
    null, {}, { ...profile, email: "owner@example.test" },
    { ...profile, email: "owner@workspace.example" },
    { ...profile, email_verified: false }, { ...profile, email_verified: "true" },
    { ...profile, email_verified: undefined }, { ...profile, sub: "" },
    { ...profile, sub: "another-subject" },
  ]) assert.equal(approvedGoogleIdentity(invalid, account), null);
  assert.equal(approvedGoogleIdentity(profile, null), null);
  assert.equal(approvedGoogleIdentity(profile, { ...account, provider: "github" }), null);
});

test("an existing email cannot be relinked to another Google subject", () => {
  assert.equal(matchesLinkedGoogleSubject(undefined, profile.sub), true);
  assert.equal(matchesLinkedGoogleSubject([account], profile.sub), true);
  assert.equal(matchesLinkedGoogleSubject([account], "different-subject"), false);
  assert.equal(matchesLinkedGoogleSubject([], profile.sub), false);
  assert.equal(matchesLinkedGoogleSubject([{ ...account, provider: "github" }], profile.sub), false);
});

test("return URLs cannot redirect to an attacker or arbitrary application route", () => {
  const origin = "https://devstash.example.test";
  for (const url of ["https://evil.test", "//evil.test", "/vault?secret=fake", "javascript:alert(1)", "\\evil.test", `${origin}/login?next=evil`]) {
    assert.equal(authenticationRedirect(url, origin), `${origin}/dashboard`);
  }
  assert.equal(authenticationRedirect("/login", origin), `${origin}/login`);
  assert.equal(authenticationRedirect(`${origin}/login`, origin), `${origin}/login`);
});

test("OAuth callback may arrive from Google but cross-origin POST and host injection are rejected", () => {
  const origin = "https://devstash.example.test";
  const request = (method: string, headers: Record<string, string> = {}) => new Request(`${origin}/api/auth/session`, {
    method, headers: { host: "devstash.example.test", ...headers },
  });
  assert.equal(isTrustedAuthRequest(request("GET"), origin), true);
  assert.equal(isTrustedAuthRequest(request("POST", { origin }), origin), true);
  assert.equal(isTrustedAuthRequest(request("POST"), origin), false);
  assert.equal(isTrustedAuthRequest(request("POST", { origin: "https://evil.test" }), origin), false);
  assert.equal(isTrustedAuthRequest(request("GET", { host: "evil.test" }), origin), false);
  assert.equal(isTrustedAuthRequest(request("GET", { "x-forwarded-host": "evil.test" }), origin), false);
});
