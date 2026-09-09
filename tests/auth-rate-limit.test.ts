import assert from "node:assert/strict";
import test from "node:test";
import { AUTH_ACTIONS, AUTH_RATE_LIMIT_POLICIES, AUTH_ROUTES } from "../app/lib/auth/config";
import { allowAuthAttempt, getRateLimitedAuthAction } from "../app/lib/auth/rate-limit";
import type { AuthRateLimitRepository } from "../app/lib/auth/rate-limit-repository";

function repository(
  behavior: Partial<Record<keyof AuthRateLimitRepository, boolean>>,
  calls: string[],
): AuthRateLimitRepository {
  return {
    async resetExpiredWindow() {
      calls.push("reset");
      return behavior.resetExpiredWindow ?? false;
    },
    async incrementActiveWindow() {
      calls.push("increment");
      return behavior.incrementActiveWindow ?? false;
    },
    async createWindow() {
      calls.push("create");
      return behavior.createWindow ?? false;
    },
  };
}

test("rate-limited actions are derived from the configured auth API route", () => {
  assert.equal(
    getRateLimitedAuthAction(`${AUTH_ROUTES.api}/${AUTH_ACTIONS.signIn}/google`),
    AUTH_ACTIONS.signIn,
  );
  assert.equal(
    getRateLimitedAuthAction(`${AUTH_ROUTES.api}/${AUTH_ACTIONS.callback}/google`),
    AUTH_ACTIONS.callback,
  );
  assert.equal(getRateLimitedAuthAction(`${AUTH_ROUTES.api}/${AUTH_ACTIONS.signOut}`), null);
  assert.equal(getRateLimitedAuthAction("/unrelated/signin/google"), null);
});

test("an expired rate-limit window resets before another counter is created", async () => {
  const calls: string[] = [];
  const allowed = await allowAuthAttempt(
    repository({ resetExpiredWindow: true }, calls),
    AUTH_ACTIONS.signIn,
    new Date("2026-09-09T00:00:00Z"),
  );
  assert.equal(allowed, true);
  assert.deepEqual(calls, ["reset"]);
});

test("an active window increments only below its configured maximum", async () => {
  const calls: string[] = [];
  const allowed = await allowAuthAttempt(
    repository({ incrementActiveWindow: true }, calls),
    AUTH_ACTIONS.callback,
  );
  assert.equal(allowed, true);
  assert.deepEqual(calls, ["reset", "increment"]);
  assert.ok(AUTH_RATE_LIMIT_POLICIES[AUTH_ACTIONS.callback].maxAttempts > 0);
});

test("a concurrent first request retries the conditional increment", async () => {
  const calls: string[] = [];
  let incrementCalls = 0;
  const fake: AuthRateLimitRepository = {
    async resetExpiredWindow() { calls.push("reset"); return false; },
    async incrementActiveWindow() {
      calls.push("increment");
      incrementCalls += 1;
      return incrementCalls === 2;
    },
    async createWindow() { calls.push("create"); return false; },
  };
  assert.equal(await allowAuthAttempt(fake, AUTH_ACTIONS.signIn), true);
  assert.deepEqual(calls, ["reset", "increment", "create", "increment"]);
});

test("a full active window rejects another attempt", async () => {
  const calls: string[] = [];
  assert.equal(await allowAuthAttempt(repository({}, calls), AUTH_ACTIONS.signIn), false);
  assert.deepEqual(calls, ["reset", "increment", "create", "increment"]);
});
