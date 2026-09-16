import assert from "node:assert/strict";
import test from "node:test";
import { getIdleLockState } from "../app/lib/vault-inactivity";

test("15-minute idle deadline counts down and expires at the exact boundary", () => {
  const lastActivity = 100_000;

  assert.deepEqual(getIdleLockState(lastActivity, 15, lastActivity), {
    deadlineMs: lastActivity + 900_000,
    secondsRemaining: 900,
    expired: false,
  });
  assert.equal(getIdleLockState(lastActivity, 15, lastActivity + 899_000).secondsRemaining, 1);
  assert.equal(getIdleLockState(lastActivity, 15, lastActivity + 900_000).expired, true);
  assert.equal(getIdleLockState(lastActivity, 15, lastActivity + 900_000).secondsRemaining, 0);
});

test("a recent interaction shifts expiry, while a suspended tab resumes expired", () => {
  const initialActivity = 100_000;
  const laterActivity = initialActivity + 300_000;
  const resumedAt = initialActivity + 901_000;

  assert.equal(getIdleLockState(initialActivity, 15, laterActivity).expired, false);
  assert.equal(getIdleLockState(laterActivity, 15, initialActivity + 900_000).secondsRemaining, 300);
  assert.equal(getIdleLockState(initialActivity, 15, resumedAt).expired, true);
});

test("changing duration uses the last activity rather than restarting the timer", () => {
  const lastActivity = 100_000;
  const now = lastActivity + 360_000;

  assert.equal(getIdleLockState(lastActivity, 5, now).expired, true);
  assert.equal(getIdleLockState(lastActivity, 15, now).secondsRemaining, 540);
  assert.equal(getIdleLockState(lastActivity, 30, now).secondsRemaining, 1_440);
});
