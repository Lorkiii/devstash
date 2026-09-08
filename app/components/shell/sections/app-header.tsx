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
    <header className="relative z-20 h-14 shrink-0 border-b border-[#6ea8ff]/15 bg-[#05070d]/70 backdrop-blur-md">
      <div className="h-full px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation"
            className="md:hidden p-1.5 rounded text-[#e8eefb]/70 hover:text-[#e8eefb] cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-1.5 font-bold tracking-[0.08em] text-lg text-[#e8eefb]">
            <span>DEVSTASH</span>
            <span className="text-[#6ea8ff] font-extrabold">↑</span>
          </Link>
          <span className="hidden sm:inline-block text-[10px] font-mono tracking-widest text-[#6ea8ff] px-2 py-0.5 rounded bg-[#6ea8ff]/10 border border-[#6ea8ff]/25">
            VAULT · V1
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenPalette}
          disabled={!isUnlocked}
          className="hidden sm:flex items-center gap-3 w-full max-w-sm rounded border border-[#6ea8ff]/20 bg-[#0a1220]/70 px-3 py-1.5 font-mono text-xs text-[#e8eefb]/50 hover:border-[#6ea8ff]/50 hover:text-[#e8eefb]/80 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">Search vault, run a command…</span>
          <kbd className="rounded border border-[#6ea8ff]/25 px-1.5 py-0.5 text-[10px] text-[#6ea8ff]">
            Ctrl K
          </kbd>
        </button>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            className={`flex items-center gap-2 rounded border px-2.5 py-1 font-mono text-[10px] tracking-widest ${
              isUnlocked
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                : "border-amber-400/40 bg-amber-400/10 text-amber-300"
            }`}
            aria-live="polite"
          >
            {isUnlocked ? <LockOpen className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            <span>{isUnlocked ? "UNLOCKED" : "LOCKED"}</span>
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
            className="p-1.5 rounded border border-[#6ea8ff]/20 text-[#e8eefb]/60 hover:text-[#e8eefb] hover:border-[#6ea8ff]/50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
