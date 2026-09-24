"use client";

import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, FolderPlus, KeyRound, ListPlus, NotebookPen } from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  hint: string;
  href: string;
  icon: LucideIcon;
  accentClass: string;
}

// Creation intent is a non-sensitive URL flag; private form values never enter
// navigation state and remain inside the destination module's local flow.
const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "secret",
    label: "New secret",
    hint: "Credential, token, database, or SSH material",
    href: "/vault?create=1",
    icon: KeyRound,
    accentClass: "text-accent-strong bg-accent/10 border-accent/25",
  },
  {
    id: "project",
    label: "Start project",
    hint: "A private workspace for related developer records",
    href: "/projects?create=1",
    icon: FolderPlus,
    accentClass: "text-violet-700 dark:text-violet-200 bg-violet-400/10 border-violet-400/25",
  },
  {
    id: "note",
    label: "Capture note",
    hint: "Encrypted context, decisions, and references",
    href: "/notes?create=1",
    icon: NotebookPen,
    accentClass: "text-amber-800 dark:text-amber-200 bg-amber-400/10 border-amber-400/25",
  },
  {
    id: "task",
    label: "Queue task",
    hint: "Put the next private action into motion",
    href: "/tasks?create=1",
    icon: ListPlus,
    accentClass: "text-emerald-700 dark:text-emerald-200 bg-emerald-400/10 border-emerald-400/25",
  },
];

export function QuickActionsPanel() {
  return (
    <section aria-labelledby="capture-dock-title" className="overflow-hidden rounded-xl border border-accent/20 bg-surface/85 font-mono shadow-[0_10px_32px_rgba(0,0,0,0.14)]">
      <header className="flex flex-wrap items-center justify-between gap-1.5 border-b border-accent/15 px-3 py-2.5 sm:gap-2 sm:px-5 sm:py-3">
        <h2 id="capture-dock-title" className="text-sm font-semibold text-foreground sm:text-base">Capture</h2>
        <p className="text-[10px] text-subtle-foreground">Plaintext stays in this tab</p>
      </header>

      <div className="grid grid-cols-2 xl:grid-cols-4">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              href={action.href}
              className="group flex min-h-20 min-w-0 items-center gap-2.5 border-b border-r border-accent/10 px-3 py-3 transition-colors hover:bg-accent/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/55 [&:nth-child(even)]:border-r-0 [&:nth-child(n+3)]:border-b-0 sm:gap-3 sm:px-4 xl:border-b-0 xl:[&:nth-child(even)]:border-r xl:last:border-r-0"
            >
              <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded border ${action.accentClass}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold text-foreground sm:text-xs">{action.label}</span>
                <span className="mt-0.5 hidden font-sans text-[11px] leading-4 text-subtle-foreground sm:block">{action.hint}</span>
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-accent transition-colors group-hover:text-accent-strong" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
