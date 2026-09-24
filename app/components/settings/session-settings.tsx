"use client";

import { useState } from "react";
import { LoaderCircle, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { useVaultSession } from "@/app/lib/vault-session";
import { AUTH_ROUTES } from "@/app/lib/auth/config";

export function SessionSettings() {
  const { prepareForSignOut } = useVaultSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    prepareForSignOut();
    await signOut({ redirectTo: AUTH_ROUTES.login });
  };

  return (
    <ConsolePanel title="GOOGLE SESSION" status="VERIFIED" tone="green">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="max-w-3xl">
          <p className="text-[13px] font-semibold text-foreground sm:text-base">Signed in with a verified Google account</p>
          <p className="mt-0.5 text-xs leading-[1.125rem] text-muted-foreground sm:mt-1 sm:text-sm sm:leading-6">
            Signing out clears the unlocked vault state first, then ends the Google session. Closing or navigating away does not sign you out.
          </p>
        </div>
        <button
          type="button"
          disabled={isSigningOut}
          onClick={() => void handleSignOut()}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-rose-500/45 bg-rose-500/10 px-3 py-2 font-mono text-[11px] font-semibold tracking-wider text-rose-700 transition-colors hover:bg-rose-500/18 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-200 sm:min-h-11 sm:px-4 sm:text-xs"
        >
          {isSigningOut ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          {isSigningOut ? "SIGNING OUT" : "SIGN OUT"}
        </button>
      </div>
    </ConsolePanel>
  );
}
