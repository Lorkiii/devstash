"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RecentKind, RecentRef, VaultData } from "./vault-data.types";
import type { AutoLockMinutes, VaultLockState, VaultSessionValue } from "./vault-session.types";

// Ephemeral vault state. Authentication cannot populate it: a reviewed local
// DEK unwrap and decryption flow must exist before unlocking can be enabled.

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
];

const MAX_RECENTS = 8;

const VaultSessionContext = createContext<VaultSessionValue | null>(null);

export function VaultSessionProvider({ children }: { children: React.ReactNode }) {
  const [lockState, setLockState] = useState<VaultLockState>("locked");
  const [data, setData] = useState<VaultData | null>(null);
  const [unlockedAt, setUnlockedAt] = useState<number | null>(null);
  const [autoLockMinutes, setAutoLockMinutes] = useState<AutoLockMinutes>(15);
  const [secondsUntilAutoLock, setSecondsUntilAutoLock] = useState<number | null>(null);
  const [recents, setRecents] = useState<RecentRef[]>([]);
  const lastActivityRef = useRef<number>(0);

  const lock = useCallback(() => {
    // Drop every reachable reference to decrypted content in one place.
    setLockState("locked");
    setData(null);
    setUnlockedAt(null);
    setSecondsUntilAutoLock(null);
    setRecents([]);
  }, []);

  const touchRecent = useCallback((kind: RecentKind, id: string) => {
    setRecents((current) => {
      const withoutSame = current.filter((entry) => !(entry.kind === kind && entry.id === id));
      return [{ kind, id, openedAt: Date.now() }, ...withoutSame].slice(0, MAX_RECENTS);
    });
  }, []);

  // Inactivity lock: activity only bumps a ref; a 1s tick derives the countdown
  // so pointer movement does not re-render the whole app.
  useEffect(() => {
    if (lockState !== "unlocked") return;

    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((eventName) =>
      window.addEventListener(eventName, markActivity, { passive: true })
    );

    const tick = window.setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, Math.ceil((autoLockMinutes * 60_000 - idleMs) / 1000));
      setSecondsUntilAutoLock(remaining);
      if (remaining === 0) lock();
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => window.removeEventListener(eventName, markActivity));
      window.clearInterval(tick);
    };
  }, [lockState, autoLockMinutes, lock]);

  const value = useMemo<VaultSessionValue>(
    () => ({
      lockState,
      data,
      unlockedAt,
      autoLockMinutes,
      secondsUntilAutoLock,
      recents,
      lock,
      setAutoLockMinutes,
      touchRecent,
    }),
    [lockState, data, unlockedAt, autoLockMinutes, secondsUntilAutoLock, recents, lock, touchRecent]
  );

  return <VaultSessionContext.Provider value={value}>{children}</VaultSessionContext.Provider>;
}

export function useVaultSession(): VaultSessionValue {
  const context = useContext(VaultSessionContext);
  if (!context) {
    throw new Error("useVaultSession must be used inside VaultSessionProvider");
  }
  return context;
}

// Pages under the shell only render while unlocked, so decrypted data is
// always present there. Throwing keeps the invariant visible if that changes.
export function useUnlockedVault(): VaultData {
  const { data } = useVaultSession();
  if (!data) {
    throw new Error("useUnlockedVault called while the vault is locked");
  }
  return data;
}
