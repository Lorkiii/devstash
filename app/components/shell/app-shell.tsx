"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StarfieldCanvas } from "@/app/components/ui/starfield-canvas";
import { VaultSessionProvider, useVaultSession } from "@/app/lib/vault-session";
import { AppSidebar } from "./sections/app-sidebar";
import { AppHeader } from "./sections/app-header";
import { AppStatusBar } from "./sections/app-status-bar";
import { VaultLockPanel } from "./lock/vault-lock-panel";
import { CommandPalette } from "./palette/command-palette";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <VaultSessionProvider>
      <ShellFrame>{children}</ShellFrame>
    </VaultSessionProvider>
  );
}

// Authenticated shell. Pages are only mounted while the vault is unlocked; the
// locked face swaps every content area for the unlock panel so no decrypted
// data, titles, or counts can render before the local unlock succeeds.
function ShellFrame({ children }: AppShellProps) {
  const router = useRouter();
  const session = useVaultSession();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(false);

  const isUnlocked = session.lockState === "unlocked";
  const recordCount = session.data
    ? session.data.secrets.length +
      session.data.envBundles.length +
      session.data.projects.length +
      session.data.notes.length +
      session.data.tasks.length
    : 0;

  const handleLock = useCallback(() => {
    setIsPaletteOpen(false);
    session.lock();
  }, [session]);

  const handleSignOut = useCallback(() => {
    // Order matters: clear vault state first, then end the session. In this
    // preview there is no Auth.js session yet, so we only navigate to "/".
    session.lock();
    router.push("/");
  }, [session, router]);

  const handleUnlock = useCallback(() => {
    setIsPaletteOpen(false);
    session.unlock();
  }, [session]);

  useEffect(() => {
    if (!isUnlocked) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isUnlocked]);

  return (
    <div className="relative h-dvh flex flex-col bg-[#05070d] text-[#e8eefb] overflow-hidden">
      <div className="absolute inset-0 opacity-50 pointer-events-none">
        <StarfieldCanvas starCount={90} />
      </div>

      <AppHeader
        isUnlocked={isUnlocked}
        secondsUntilAutoLock={session.secondsUntilAutoLock}
        onOpenPalette={() => setIsPaletteOpen(true)}
        onOpenMobileNav={() => setIsMobileNavOpen(true)}
        onSignOut={handleSignOut}
      />

      <div className="relative z-10 flex flex-1 min-h-0">
        <AppSidebar
          isUnlocked={isUnlocked}
          onLock={handleLock}
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
          {isUnlocked ? (
            <div className="px-4 sm:px-6 lg:px-8 py-5 max-w-7xl mx-auto">{children}</div>
          ) : (
            <div className="h-full flex items-center justify-center px-4 py-8">
              <VaultLockPanel onUnlock={handleUnlock} />
            </div>
          )}
        </main>
      </div>

      <AppStatusBar
        isUnlocked={isUnlocked}
        recordCount={recordCount}
        secondsUntilAutoLock={session.secondsUntilAutoLock}
      />

      {isUnlocked && session.data && isPaletteOpen && (
        <CommandPalette
          onClose={() => setIsPaletteOpen(false)}
          data={session.data}
          onLock={handleLock}
        />
      )}
    </div>
  );
}
