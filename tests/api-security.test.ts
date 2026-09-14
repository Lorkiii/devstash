import assert from "node:assert/strict";
import test from "node:test";
import { hasTrustedMutationOrigin, readBoundedJson } from "../app/lib/api/request";
import {
  VAULT_BACKUP_RATE_LIMIT_ACTIONS,
  VAULT_BACKUP_RATE_LIMIT_POLICIES,
  vaultBackupRateLimitKey,
  vaultBackupRateLimitResponse,
} from "../app/lib/api/rate-limit";
import { errorResponse, successResponse } from "../app/lib/api/response";
import {
  GLOBAL_SECURITY_HEADERS,
  PRIVATE_CACHE_CONTROL,
  PRIVATE_ROBOTS_HEADER,
  STRICT_TRANSPORT_SECURITY,
} from "../app/lib/security/headers";

process.env.AUTH_SECRET = "synthetic-test-secret-with-at-least-32-characters";
process.env.AUTH_URL = "https://devstash.example.test";
process.env.AUTH_GOOGLE_CLIENT_ID = "fake-google-client";
process.env.AUTH_GOOGLE_CLIENT_SECRET = "fake-google-client-secret";
process.env.DATABASE_URL = "postgresql://fake:fake@localhost:5432/fake";

function mutationRequest(headers: Record<string, string> = {}) {
  return new Request("https://devstash.example.test/api/vault/profile", {
    method: "POST",
    headers: {
      host: "devstash.example.test",
      origin: "https://devstash.example.test",
      ...headers,
    },
  });
}

test("mutation origin checks reject missing/cross-origin and forwarded host confusion", () => {
  assert.equal(hasTrustedMutationOrigin(mutationRequest()), true);
  assert.equal(hasTrustedMutationOrigin(mutationRequest({ origin: "https://attacker.example" })), false);
  assert.equal(hasTrustedMutationOrigin(mutationRequest({ origin: "" })), false);
  assert.equal(hasTrustedMutationOrigin(mutationRequest({ host: "attacker.example" })), false);
  assert.equal(
    hasTrustedMutationOrigin(mutationRequest({ "x-forwarded-host": "attacker.example" })),
    false,
  );
});

test("bounded JSON accepts exact JSON and rejects type, declaration, stream, and UTF-8 failures", async () => {
  const valid = new Request("https://devstash.example.test/api/test", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ synthetic: true }),
  });
  assert.deepEqual(await readBoundedJson(valid, 64), { synthetic: true });

  const requests = [
    new Request("https://devstash.example.test/api/test", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "{}",
    }),
    new Request("https://devstash.example.test/api/test", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "65" },
      body: "{}",
    }),
    new Request("https://devstash.example.test/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ oversized: "x".repeat(100) }),
    }),
    new Request("https://devstash.example.test/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: new Uint8Array([0xc3, 0x28]),
    }),
    new Request("https://devstash.example.test/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid",
    }),
  ];
  for (const request of requests) {
    await assert.rejects(readBoundedJson(request, 64), { name: "InvalidJsonRequestError" });
  }
});

test("private responses and configured headers deny storage, embedding, and unused capabilities", async () => {
  for (const response of [successResponse({ synthetic: true }), errorResponse("Unavailable.", 500)]) {
    assert.equal(response.headers.get("cache-control"), PRIVATE_CACHE_CONTROL);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  }
  assert.deepEqual(Object.fromEntries(GLOBAL_SECURITY_HEADERS.map(({ key, value }) => [key, value])), {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy": "camera=(), display-capture=(), geolocation=(), microphone=(), payment=(), usb=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-DNS-Prefetch-Control": "off",
    "X-Frame-Options": "DENY",
  });
  assert.equal(PRIVATE_ROBOTS_HEADER, "noindex, nofollow, noarchive");
  assert.equal(STRICT_TRANSPORT_SECURITY, "max-age=31536000; includeSubDomains");
});

test("backup rate-limit buckets are owner/action isolated and return a bounded retry", async () => {
  const owner = "synthetic-owner";
  assert.notEqual(
    vaultBackupRateLimitKey(owner, VAULT_BACKUP_RATE_LIMIT_ACTIONS.export),
    vaultBackupRateLimitKey(owner, VAULT_BACKUP_RATE_LIMIT_ACTIONS.restore),
  );
  assert.notEqual(
    vaultBackupRateLimitKey(owner, VAULT_BACKUP_RATE_LIMIT_ACTIONS.restore),
    vaultBackupRateLimitKey("other-owner", VAULT_BACKUP_RATE_LIMIT_ACTIONS.restore),
  );

  const response = vaultBackupRateLimitResponse(VAULT_BACKUP_RATE_LIMIT_ACTIONS.restore);
  assert.equal(response.status, 429);
  assert.equal(
    response.headers.get("retry-after"),
    String(VAULT_BACKUP_RATE_LIMIT_POLICIES[VAULT_BACKUP_RATE_LIMIT_ACTIONS.restore].windowMs / 1_000),
  );
  assert.equal(response.headers.get("cache-control"), PRIVATE_CACHE_CONTROL);
  assert.deepEqual(await response.json(), {
    success: false,
    message: "Too many encrypted backup requests. Try again later.",
  });
});
