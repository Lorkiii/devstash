"use client";

import React from "react";
import Link from "next/link";
import { Menu, Search, Lock, LockOpen, LogOut } from "lucide-react";
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
  return (
    <header className="relative z-20 h-14 shrink-0 border-b border-accent/15 bg-background/70 backdrop-blur-md">
      <div className="flex h-full items-center justify-between gap-2 px-4 sm:gap-3 sm:px-5 lg:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded text-muted-foreground hover:text-foreground cursor-pointer md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-1.5 font-bold tracking-[0.08em] text-lg text-foreground">
            <span>DEVSTASH</span>
            <span className="text-accent font-extrabold">↑</span>
          </Link>
          <span className="hidden sm:inline-block text-[10px] font-mono tracking-widest text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/25">
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
            className={`flex min-h-10 min-w-10 items-center justify-center gap-2 rounded border px-2.5 py-1 font-mono text-[10px] tracking-widest sm:min-h-0 sm:min-w-0 sm:justify-start ${
              isUnlocked
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                : "border-amber-400/40 bg-amber-400/10 text-amber-300"
            }`}
            aria-label={isUnlocked ? "Vault unlocked" : "Vault locked"}
            aria-live="polite"
          >
            {isUnlocked ? <LockOpen className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            <span className="hidden sm:inline">{isUnlocked ? "UNLOCKED" : "LOCKED"}</span>
            {isUnlocked && secondsUntilAutoLock !== null && (
              <span className="hidden sm:inline text-emerald-200/70">
                · {formatCountdown(secondsUntilAutoLock)}
              </span>
            )}
          </div>
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
