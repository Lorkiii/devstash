"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { fetchAccountProfile, persistAccountProfile } from "@/app/lib/account-profile-client";
import type { AccountProfile } from "@/app/lib/account-profile";

interface AccountProfileContextValue {
  profile: AccountProfile | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  clear: () => void;
  saveDisplayName: (displayName: string | null) => Promise<void>;
}

interface ProfileSnapshot {
  ownerId: string;
  profile: AccountProfile | null;
  error: string | null;
}

const AccountProfileContext = createContext<AccountProfileContextValue | null>(null);

export function AccountProfileProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const ownerId = status === "authenticated" ? session?.user.id : null;
  const [snapshot, setSnapshot] = useState<ProfileSnapshot | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const requestControllerRef = useRef<AbortController | null>(null);
  const current = snapshot?.ownerId === ownerId ? snapshot : null;

  useEffect(() => {
    if (!ownerId) return;
    const controller = new AbortController();
    requestControllerRef.current = controller;

    void fetchAccountProfile(controller.signal).then(
      (profile) => {
        if (!controller.signal.aborted) setSnapshot({ ownerId, profile, error: null });
      },
      () => {
        if (!controller.signal.aborted) {
          setSnapshot({ ownerId, profile: null, error: "Account profile could not be loaded." });
        }
      },
    );

    return () => {
      controller.abort();
      if (requestControllerRef.current === controller) requestControllerRef.current = null;
    };
  }, [ownerId, requestVersion]);

  const reload = useCallback(() => {
    setSnapshot(null);
    setRequestVersion((version) => version + 1);
  }, []);

  const clear = useCallback(() => {
    requestControllerRef.current?.abort();
    setSnapshot(null);
  }, []);

  const saveDisplayName = useCallback(async (displayName: string | null) => {
    if (!ownerId || !current?.profile) throw new Error("Account profile is unavailable.");
    const profile = await persistAccountProfile(displayName);
    setSnapshot({ ownerId, profile, error: null });
  }, [current?.profile, ownerId]);

  return (
    <AccountProfileContext.Provider value={{
      profile: current?.profile ?? null,
      isLoading: Boolean(ownerId && !current),
      error: current?.error ?? null,
      reload,
      clear,
      saveDisplayName,
    }}>
      {children}
    </AccountProfileContext.Provider>
  );
}

export function useAccountProfile(): AccountProfileContextValue {
  const context = useContext(AccountProfileContext);
  if (!context) throw new Error("useAccountProfile must be used within AccountProfileProvider.");
  return context;
}
