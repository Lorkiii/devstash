import type { AutoLockMinutes } from "./vault-session.types";

interface IdleLockState {
  deadlineMs: number;
  secondsRemaining: number;
  expired: boolean;
}

export function getIdleLockState(
  lastActivityMs: number,
  autoLockMinutes: AutoLockMinutes,
  nowMs: number,
): IdleLockState {
  const deadlineMs = lastActivityMs + autoLockMinutes * 60_000;
  const secondsRemaining = Math.max(0, Math.ceil((deadlineMs - nowMs) / 1_000));

  return {
    deadlineMs,
    secondsRemaining,
    expired: nowMs >= deadlineMs,
  };
}
