"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, CheckSquare2, FolderKanban, KeyRound, NotebookPen } from "lucide-react";
import { EmptyState } from "@/app/components/ui/empty-state";
import { TypeBadge } from "@/app/components/ui/type-badge";
import { formatElapsed } from "@/app/lib/format";
import type { RecentRef, VaultData } from "@/app/lib/vault-data.types";

interface RecentPanelProps {
  data: VaultData;
  recents: RecentRef[];
}

interface ResolvedRecent {
  key: string;
  title: string;
  href: string;
  kindLabel: string;
  openedAt: number;
  icon: LucideIcon;
  iconClass: string;
  badge?: React.ReactNode;
}

// Recent navigation is intentionally reconstructed from session-memory refs.
// Persisting this trail would create a plaintext mirror of private titles.
export function RecentPanel({ data, recents }: RecentPanelProps) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(tick);
  }, []);

  const resolved: ResolvedRecent[] = recents.flatMap((entry) => {
    switch (entry.kind) {
      case "secret": {
        const item = data.secrets.find((secret) => secret.id === entry.id);
        return item
          ? [{
              key: `secret-${item.id}`,
              title: item.title,
              href: `/vault?item=${item.id}`,
              kindLabel: "Vault record",
              openedAt: entry.openedAt,
              icon: KeyRound,
              iconClass: "border-accent/25 bg-accent/10 text-accent-strong",
              badge: <TypeBadge type={item.type} />,
            }]
          : [];
      }
      case "project": {
        const project = data.projects.find((candidate) => candidate.id === entry.id);
        return project
          ? [{
              key: `project-${project.id}`,
              title: project.name,
              href: `/projects/${project.id}`,
              kindLabel: "Project workspace",
              openedAt: entry.openedAt,
              icon: FolderKanban,
              iconClass: "border-violet-400/25 bg-violet-400/10 text-violet-200",
            }]
          : [];
      }
      case "note": {
        const note = data.notes.find((candidate) => candidate.id === entry.id);
        return note
          ? [{
              key: `note-${note.id}`,
              title: note.title,
              href: `/notes?note=${note.id}`,
              kindLabel: "Private note",
              openedAt: entry.openedAt,
              icon: NotebookPen,
              iconClass: "border-amber-400/25 bg-amber-400/10 text-amber-200",
            }]
          : [];
      }
      case "task": {
        const task = data.tasks.find((candidate) => candidate.id === entry.id);
        return task
          ? [{
              key: `task-${task.id}`,
              title: task.title,
              href: "/tasks",
              kindLabel: "Task",
              openedAt: entry.openedAt,
              icon: CheckSquare2,
              iconClass: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
            }]
          : [];
      }
    }
  }).slice(0, 6);

  return (
    <section aria-labelledby="session-trail-title" className="h-full overflow-hidden rounded-xl border border-accent/20 bg-surface/85 shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-accent/15 px-4 py-4 sm:px-5">
        <div>
          <p className="font-mono text-[9px] tracking-[0.2em] text-accent">EPHEMERAL NAVIGATION LOG</p>
          <h2 id="session-trail-title" className="mt-1 text-lg font-bold tracking-tight text-foreground">Session trail</h2>
        </div>
        <span className="rounded-full border border-foreground/10 bg-surface-inset/60 px-2.5 py-1 font-mono text-[9px] tracking-widest text-subtle-foreground">
          CLEARS ON LOCK
        </span>
      </header>

      <div className="p-4 sm:p-5">
        {resolved.length === 0 ? (
          <EmptyState
            message="Your session trail is quiet."
            hint="Open a record, project, note, or task and it will appear here until the vault locks."
            className="flex min-h-40 flex-col justify-center"
          />
        ) : (
          <ol className="relative space-y-1 before:absolute before:bottom-6 before:left-[18px] before:top-6 before:w-px before:bg-gradient-to-b before:from-accent/35 before:via-accent/15 before:to-transparent">
            {resolved.map((entry, index) => {
              const Icon = entry.icon;
              return (
                <li key={entry.key} className="relative">
                  <Link
                    href={entry.href}
                    className="group grid min-h-16 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-1 py-2.5 transition-colors hover:bg-accent/[0.06] sm:px-2"
                  >
                    <span className={`relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border ${entry.iconClass}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-muted-foreground transition-colors group-hover:text-foreground">{entry.title}</span>
                        {entry.badge}
                      </span>
                      <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-widest text-subtle-foreground">
                        {String(index + 1).padStart(2, "0")} / {entry.kindLabel} / {formatElapsed(entry.openedAt, now)}
                      </span>
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-accent transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-strong" />
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
