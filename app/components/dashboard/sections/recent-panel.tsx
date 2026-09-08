"use client";

import React from "react";
import Link from "next/link";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { EmptyState } from "@/app/components/ui/empty-state";
import { TypeBadge } from "@/app/components/ui/type-badge";
import type { RecentRef, VaultData } from "@/app/lib/vault-data.types";

interface RecentPanelProps {
  data: VaultData;
  recents: RecentRef[];
}

interface ResolvedRecent {
  key: string;
  title: string;
  href: string;
  badge: React.ReactNode;
}

// "Recent" lives only in session memory; a persisted list would be a plaintext
// mirror of record titles.
export function RecentPanel({ data, recents }: RecentPanelProps) {
  const resolved: ResolvedRecent[] = recents.flatMap((entry) => {
    switch (entry.kind) {
      case "secret": {
        const item = data.secrets.find((secret) => secret.id === entry.id);
        return item
          ? [{ key: `secret-${item.id}`, title: item.title, href: `/vault?item=${item.id}`, badge: <TypeBadge type={item.type} /> }]
          : [];
      }
      case "project": {
        const project = data.projects.find((candidate) => candidate.id === entry.id);
        return project
          ? [{ key: `project-${project.id}`, title: project.name, href: `/projects/${project.id}`, badge: <Chip>PROJECT</Chip> }]
          : [];
      }
      case "note": {
        const note = data.notes.find((candidate) => candidate.id === entry.id);
        return note
          ? [{ key: `note-${note.id}`, title: note.title, href: `/notes?note=${note.id}`, badge: <Chip>NOTE</Chip> }]
          : [];
      }
      case "task": {
        const task = data.tasks.find((candidate) => candidate.id === entry.id);
        return task ? [{ key: `task-${task.id}`, title: task.title, href: "/tasks", badge: <Chip>TASK</Chip> }] : [];
      }
    }
  });

  return (
    <ConsolePanel title="RECENT" status="THIS SESSION" className="h-full">
      {resolved.length === 0 ? (
        <EmptyState
          message="no records opened this session."
          hint="Recents are kept in memory only and cleared on lock."
        />
      ) : (
        <ul className="divide-y divide-[#6ea8ff]/10">
          {resolved.map((entry) => (
            <li key={entry.key}>
              <Link
                href={entry.href}
                className="flex items-center justify-between gap-3 py-2 text-xs text-[#e8eefb]/85 hover:text-[#6ea8ff] transition-colors"
              >
                <span className="truncate">{entry.title}</span>
                {entry.badge}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ConsolePanel>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-[#e8eefb]/15 text-[10px] tracking-widest text-[#e8eefb]/55">
      {children}
    </span>
  );
}
