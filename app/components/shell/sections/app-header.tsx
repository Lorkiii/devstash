"use client";

import React from "react";
import Link from "next/link";
import { Menu, Search, Lock, LockOpen, LogOut } from "lucide-react";
import { AccountAvatar } from "@/app/components/account/account-avatar";
import { useAccountProfile } from "@/app/components/account/account-profile-provider";
import { formatCountdown } from "@/app/lib/format";

interface AppHeaderProps {
  isUnlocked: boolean;
  secondsUntilAutoLock: number | null;
  onOpenPalette: () => void;
  onOpenMobileNav: () => void;
  onSignOut: () => void;
}

export function AppHeader({
  isUnlocked,
  secondsUntilAutoLock,
  onOpenPalette,
  onOpenMobileNav,
  onSignOut,
}: AppHeaderProps) {
  const { profile } = useAccountProfile();
  const countdown = secondsUntilAutoLock === null ? null : formatCountdown(secondsUntilAutoLock);

  return (
    <header className="relative z-20 h-14 shrink-0 border-b border-accent/15 bg-background/70 backdrop-blur-md">
      <div className="flex h-full items-center justify-between gap-2 px-3 sm:gap-3 sm:px-5 lg:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded text-muted-foreground hover:text-foreground cursor-pointer md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-1.5 font-bold tracking-[0.08em] text-base text-foreground sm:text-lg">
            <span className="min-[400px]:hidden">DS</span>
            <span className="hidden min-[400px]:inline">DEVSTASH</span>
            <span className="text-accent font-extrabold">↑</span>
          </Link>
          <span className="hidden lg:inline-block text-[10px] font-mono tracking-widest text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/25">
            PRIVATE VAULT
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenPalette}
          disabled={!isUnlocked}
          className="hidden sm:flex items-center gap-3 w-full max-w-sm rounded border border-accent/20 bg-surface/70 px-3 py-1.5 font-mono text-xs text-subtle-foreground hover:border-accent/50 hover:text-muted-foreground transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">Search vault, run a command…</span>
          <kbd className="rounded border border-accent/25 px-1.5 py-0.5 text-[10px] text-accent">
            Ctrl K
          </kbd>
        </button>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <div
            className={`flex min-h-10 items-center justify-center gap-1.5 rounded border px-2 py-1 font-mono text-[11px] tracking-wider sm:min-h-0 sm:justify-start sm:px-2.5 ${
              isUnlocked
                ? "border-emerald-600/45 bg-emerald-50 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200"
                : "border-amber-600/45 bg-amber-50 text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200"
            }`}
          >
            <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5">
              {isUnlocked ? <LockOpen aria-hidden="true" className="h-3.5 w-3.5" /> : <Lock aria-hidden="true" className="h-3.5 w-3.5" />}
              <span className="sr-only">{isUnlocked ? "Vault unlocked" : "Vault locked"}</span>
              <span aria-hidden="true" className="hidden sm:inline">{isUnlocked ? "UNLOCKED" : "LOCKED"}</span>
            </span>
            {isUnlocked && countdown !== null && (
              <span
                role="timer"
                aria-live="off"
                aria-label={`Auto-lock in ${countdown} after inactivity`}
                className="border-l border-current/30 pl-1.5 text-xs font-bold tracking-normal text-foreground tabular-nums sm:pl-2 sm:text-[13px]"
              >
                <span aria-hidden="true" className="hidden lg:inline">LOCK IN </span>
                <span aria-hidden="true">{countdown}</span>
              </span>
            )}
          </div>
          <Link
            href="/settings#profile-settings"
            aria-label={isUnlocked ? "Open profile settings" : "Unlock vault to open profile settings"}
            title={isUnlocked ? "Profile settings" : "Unlock vault to edit profile"}
            className="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-full border border-transparent text-foreground transition-colors hover:border-accent/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent xl:px-1.5"
          >
            <AccountAvatar displayName={profile?.displayName ?? null} />
            <span className="hidden max-w-28 truncate text-sm font-semibold xl:inline">
              {profile?.displayName ?? "Profile"}
            </span>
          </Link>
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded border border-accent/20 text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
