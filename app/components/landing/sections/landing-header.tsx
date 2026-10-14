"use client";

import React from "react";
import { ArrowUpRight, Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/components/theme/theme-provider";
import type { LandingHeaderProps } from "./landing-header.types";

export function LandingHeader({
  onOpenEnvelopeModal,
  onSignInClick,
}: LandingHeaderProps) {
  const { theme, setTheme, isSaving, error } = useTheme();
  const isDark = theme === "dark";

  return (
    <header className="relative z-20 w-full border-b border-border/40">
      <div className="flex min-h-20 w-full items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-5 lg:px-6">
        <div className="flex min-w-0 items-center gap-5">
          <div className="flex shrink-0 items-center gap-1 text-lg font-bold tracking-[0.06em] text-foreground sm:text-xl">
            <span>DEVSTASH</span>
            <ArrowUpRight className="h-5 w-5 text-accent-strong" aria-hidden="true" />
          </div>
          <span className="hidden border-l border-border/60 pl-5 text-xs text-muted-foreground lg:inline-block">
            PRIVATE DEVELOPER VAULT
          </span>
        </div>

        <nav aria-label="Landing page" className="ml-auto hidden items-center md:flex">
          <button
            type="button"
            onClick={onOpenEnvelopeModal}
            className="min-h-11 cursor-pointer rounded-lg px-3 text-xs font-medium tracking-[0.06em] text-muted-foreground transition-colors hover:bg-accent/8 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
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
          className="inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-65 motion-reduce:transition-none"
        >
          {isDark ? <Moon className="h-4 w-4" aria-hidden="true" /> : <Sun className="h-4 w-4" aria-hidden="true" />}
        </button>

        <button
          type="button"
          onClick={onSignInClick}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border/70 px-3.5 py-2 text-xs font-semibold tracking-[0.06em] text-foreground transition-colors hover:border-accent hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
        >
          SIGN IN
          <ArrowUpRight className="hidden h-3.5 w-3.5 sm:block" aria-hidden="true" />
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
