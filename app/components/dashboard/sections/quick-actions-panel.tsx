"use client";

import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { KeyRound, FileCode2, NotebookPen, ListPlus, Dices, FolderPlus } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";

interface QuickAction {
  id: string;
  label: string;
  hint: string;
  href: string;
  icon: LucideIcon;
}

// Creation forms arrive with the ciphertext API phase; for now every action
// lands on the matching section.
const QUICK_ACTIONS: QuickAction[] = [
  { id: "secret", label: "+ SECRET", hint: "login, key, db, ssh", href: "/vault", icon: KeyRound },
  { id: "env", label: "+ .ENV", hint: "whole file, one record", href: "/projects", icon: FileCode2 },
  { id: "project", label: "+ PROJECT", hint: "group related records", href: "/projects", icon: FolderPlus },
  { id: "note", label: "+ NOTE", hint: "markdown, sanitized", href: "/notes", icon: NotebookPen },
  { id: "task", label: "+ TASK", hint: "per project or loose", href: "/tasks", icon: ListPlus },
  { id: "generate", label: "GENERATE", hint: "secure random password", href: "/generator", icon: Dices },
];

export function QuickActionsPanel() {
  return (
    <ConsolePanel title="QUICK ACTIONS" status="LOCAL ONLY" className="h-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              href={action.href}
              className="group flex flex-col gap-1.5 rounded border border-[#6ea8ff]/20 bg-[#070d18]/70 px-3 py-3 hover:border-[#6ea8ff]/60 hover:bg-[#0d1b32] transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-[#e8eefb]">{action.label}</span>
                <Icon className="w-3.5 h-3.5 text-[#6ea8ff] group-hover:translate-x-0.5 transition-transform" />
              </div>
              <span className="text-[10px] text-[#e8eefb]/50">{action.hint}</span>
            </Link>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] text-[#e8eefb]/40">
        <span className="text-[#6ea8ff]/70 mr-1.5">&gt;</span>
        press <kbd className="px-1 rounded border border-[#6ea8ff]/25 text-[#6ea8ff]">Ctrl K</kbd> to search
        decrypted records or jump anywhere.
      </p>
    </ConsolePanel>
  );
}
