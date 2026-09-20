"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/components/theme/theme-provider";
import type { LandingHeaderProps } from "./landing-header.types";

export function LandingHeader({
  onOpenEnvelopeModal,
  onSignInClick,
}: LandingHeaderProps) {
  const { theme, setTheme, isSaving, error } = useTheme();
  const isDark = theme === "dark";

  return (
    <header className="relative z-20 w-full border-b border-accent/15 bg-background/70 backdrop-blur-xl">
      <div className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-2 sm:px-5 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center gap-1.5 text-lg font-bold tracking-[0.08em] text-foreground sm:text-xl">
            <span>DEVSTASH</span>
            <span className="text-accent font-extrabold">↑</span>
          </div>
          <span className="hidden rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 font-mono text-[9px] tracking-[0.18em] text-accent-strong sm:inline-block">
            PRIVATE DEVELOPER VAULT
          </span>
        </div>

        <nav aria-label="Landing page" className="ml-auto hidden items-center md:flex">
          <button
            type="button"
            onClick={onOpenEnvelopeModal}
            className="min-h-10 rounded-lg px-3 font-mono text-[11px] tracking-[0.14em] text-muted-foreground transition-colors hover:bg-accent/8 hover:text-accent-strong cursor-pointer"
          >
            HOW IT WORKS
          </button>
        </nav>

        <button
          type="button"
          aria-label="Dark theme"
          aria-pressed={isDark}
          title={`Switch to ${isDark ? "light" : "dark"} theme`}
          disabled={isSaving}
          onClick={() => void setTheme(isDark ? "light" : "dark")}
          className="inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-accent/30 bg-surface/60 text-accent-strong transition-colors hover:border-accent/70 hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-65 motion-reduce:transition-none"
        >
          {isDark ? <Moon className="h-4 w-4" aria-hidden="true" /> : <Sun className="h-4 w-4" aria-hidden="true" />}
        </button>

        <button
          type="button"
          onClick={onSignInClick}
          className="min-h-10 shrink-0 rounded-lg border border-accent/70 bg-accent/8 px-3.5 py-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-accent-strong shadow-[0_0_20px_rgba(110,168,255,0.1)] transition-all duration-200 hover:border-accent-strong hover:bg-accent hover:text-accent-foreground cursor-pointer"
        >
          SIGN IN
        </button>
      </div>
      {error && (
        <p role="alert" className="border-t border-border/50 px-4 py-2 text-xs text-rose-600 dark:text-rose-200 sm:px-5 lg:px-6">
          {error}
        </p>
      )}
    </header>
  );
}
