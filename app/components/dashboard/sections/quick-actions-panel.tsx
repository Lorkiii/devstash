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
    accentClass: "text-violet-200 bg-violet-400/10 border-violet-400/25",
  },
  {
    id: "note",
    label: "Capture note",
    hint: "Encrypted context, decisions, and references",
    href: "/notes?create=1",
    icon: NotebookPen,
    accentClass: "text-amber-200 bg-amber-400/10 border-amber-400/25",
  },
  {
    id: "task",
    label: "Queue task",
    hint: "Put the next private action into motion",
    href: "/tasks?create=1",
    icon: ListPlus,
    accentClass: "text-emerald-200 bg-emerald-400/10 border-emerald-400/25",
  },
];

export function QuickActionsPanel() {
  return (
    <section aria-labelledby="capture-dock-title" className="overflow-hidden rounded-xl border border-accent/20 bg-surface/85 font-mono shadow-[0_10px_32px_rgba(0,0,0,0.14)]">
      <header className="flex flex-col gap-2 border-b border-accent/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(110,168,255,0.9)]" />
          <h2 id="capture-dock-title" className="text-[10px] font-bold tracking-[0.2em] text-accent-strong">CAPTURE DOCK</h2>
        </div>
        <p className="text-[9px] tracking-[0.16em] text-subtle-foreground">PLAINTEXT STAYS IN THIS TAB</p>
      </header>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4">
        {QUICK_ACTIONS.map((action, index) => {
          const Icon = action.icon;
          const actionNumber = String(index + 1).padStart(2, "0");
          return (
            <Link
              key={action.id}
              href={action.href}
              className="group relative min-h-32 border-b border-accent/10 p-4 transition-colors hover:bg-accent/[0.06] sm:border-r xl:border-b-0 last:border-b-0 sm:[&:nth-child(2)]:border-r-0 xl:[&:nth-child(2)]:border-r xl:last:border-r-0"
            >
              <div className="flex items-start justify-between gap-4">
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded border ${action.accentClass}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-[9px] tracking-[0.2em] text-subtle-foreground">{actionNumber}</span>
              </div>
              <div className="mt-5 pr-5">
                <h3 className="text-xs font-bold tracking-wider text-foreground">{action.label.toUpperCase()}</h3>
                <p className="mt-1.5 font-sans text-[11px] leading-4 text-subtle-foreground">{action.hint}</p>
              </div>
              <ArrowUpRight className="absolute bottom-4 right-4 h-3.5 w-3.5 text-accent transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-strong" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
