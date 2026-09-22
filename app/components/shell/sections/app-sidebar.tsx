"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Moon, Sun, X } from "lucide-react";
import { useTheme } from "@/app/components/theme/theme-provider";
import { NAV_ITEMS, isNavItemActive } from "../nav-items";

interface AppSidebarProps {
  isUnlocked: boolean;
  onLock: () => void;
  /** Mobile drawer state; ignored on md and up where the rail is always shown. */
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function AppSidebar({ isUnlocked, onLock, isMobileOpen, onCloseMobile }: AppSidebarProps) {
  const pathname = usePathname();
  // Theme is a device preference, not vault data, so the toggle stays usable while locked.
  const { theme, setTheme, isSaving: isThemeSaving, error: themeError } = useTheme();
  const isDark = theme === "dark";
  const workspaceItems = NAV_ITEMS.filter((item) => item.group === "workspace");
  const toolItems = NAV_ITEMS.filter((item) => item.group === "tools");

  const renderItem = (item: (typeof NAV_ITEMS)[number]) => {
    const active = isNavItemActive(pathname, item.href);
    const Icon = item.icon;
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onCloseMobile}
          aria-current={active ? "page" : undefined}
          aria-disabled={!isUnlocked}
          className={`group relative flex items-center gap-3 rounded px-3 py-2 font-mono text-xs tracking-wider transition-colors ${
            active
              ? "bg-accent/10 text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/5"
          } ${isUnlocked ? "" : "opacity-50"}`}
        >
          <span
            className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full ${
              active ? "bg-accent" : "bg-transparent"
            }`}
          />
          <Icon className={`w-4 h-4 shrink-0 ${active ? "text-accent" : ""}`} />
          <span className="uppercase lg:inline md:hidden">{item.label}</span>
        </Link>
      </li>
    );
  };

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 h-12 border-b border-accent/15 md:hidden sm:h-14">
        <span className="font-mono text-[10px] tracking-widest text-accent">NAVIGATION</span>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="p-1.5 rounded text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">{workspaceItems.map(renderItem)}</ul>
        <div className="my-3 mx-3 border-t border-accent/15" />
        <ul className="space-y-0.5">{toolItems.map(renderItem)}</ul>
      </nav>

      <div className="space-y-1.5 p-2 border-t border-accent/15">
        <button
          type="button"
          onClick={() => void setTheme(isDark ? "light" : "dark")}
          disabled={isThemeSaving}
          aria-pressed={isDark}
          aria-label="Dark theme"
          title={`Switch to ${isDark ? "light" : "dark"} theme`}
          className="w-full flex items-center justify-center gap-2 rounded border border-accent/25 bg-surface/60 px-3 py-2 font-mono text-xs tracking-wider text-muted-foreground hover:border-accent/50 hover:text-foreground transition-colors cursor-pointer disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
        >
          {isDark ? <Moon className="w-3.5 h-3.5 text-accent-strong" aria-hidden="true" /> : <Sun className="w-3.5 h-3.5 text-accent-strong" aria-hidden="true" />}
          <span className="lg:inline md:hidden">{isDark ? "DARK" : "LIGHT"}</span>
        </button>
        {themeError && (
          <p role="alert" className="px-1 font-mono text-[10px] leading-4 text-rose-600 dark:text-rose-200 md:hidden lg:block">
            {themeError}
          </p>
        )}
        <button
          type="button"
          onClick={onLock}
          disabled={!isUnlocked}
          className="w-full flex items-center justify-center gap-2 rounded border border-amber-400/40 bg-amber-400/10 px-3 py-2 font-mono text-xs font-semibold tracking-wider text-amber-300 hover:bg-amber-400/20 hover:border-amber-400/70 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="lg:inline md:hidden">LOCK</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop / tablet rail */}
      <aside className="hidden md:flex md:w-16 lg:w-56 shrink-0 flex-col border-r border-accent/15 bg-background/70 backdrop-blur-md">
        {content}
      </aside>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onCloseMobile}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default"
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-accent/25 bg-background shadow-[0_0_40px_rgba(0,0,0,0.7)] animate-fadeIn">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
