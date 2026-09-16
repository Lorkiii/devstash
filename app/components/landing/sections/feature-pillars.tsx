"use client";

import React from "react";
import { KeyIcon, FileCodeIcon, DatabaseIcon, LayersIcon } from "@/app/components/ui/icons";
import type { Capability } from "./feature-pillars.types";

const CAPABILITIES: Capability[] = [
  {
    id: "secrets",
    title: "Secrets & Credentials",
    summary:
      "Store logins, API keys, tokens, database access, SSH credentials, and recovery codes.",
    icon: <KeyIcon className="w-4 h-4 text-accent" />,
  },
  {
    id: "env",
    title: ".env Bundles",
    summary:
      "Keep variable names and values together as a single encrypted environment record.",
    icon: <FileCodeIcon className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
  },
  {
    id: "notes",
    title: "Private Notes",
    summary:
      "Write private Markdown notes and search them locally after browser-side decryption.",
    icon: <DatabaseIcon className="h-4 w-4 text-violet-600 dark:text-violet-400" />,
  },
  {
    id: "projects",
    title: "Projects & Tasks",
    summary:
      "Organize encrypted secrets, environments, notes, and tasks around each project.",
    icon: <LayersIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
  },
];

export function FeaturePillars() {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {CAPABILITIES.map((capability, index) => (
        <div
          key={capability.id}
          className="group relative overflow-hidden rounded-xl border border-accent/15 bg-surface/62 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/35 hover:bg-surface-strong/78"
        >
          <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-accent/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/20 bg-surface-inset/70">
                {capability.icon}
              </span>
              <h3 className="text-xs font-semibold text-foreground">{capability.title}</h3>
            </div>
            <span className="font-mono text-[9px] tracking-widest text-subtle-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>
          <p className="relative text-[11px] leading-relaxed text-muted-foreground">
            {capability.summary}
          </p>
        </div>
      ))}
    </div>
  );
}
