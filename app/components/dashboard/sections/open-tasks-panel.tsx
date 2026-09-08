"use client";

import React from "react";
import Link from "next/link";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { EmptyState } from "@/app/components/ui/empty-state";
import type { VaultData } from "@/app/lib/vault-data.types";

interface OpenTasksPanelProps {
  data: VaultData;
  limit?: number;
}

export function OpenTasksPanel({ data, limit = 5 }: OpenTasksPanelProps) {
  const open = data.tasks
    .filter((task) => !task.done)
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
    .slice(0, limit);

  const projectName = (projectId?: string) =>
    data.projects.find((project) => project.id === projectId)?.name ?? "unassigned";

  const viewAll = (
    <Link href="/tasks" className="text-[10px] tracking-widest text-[#6ea8ff]/80 hover:text-[#6ea8ff]">
      VIEW ALL →
    </Link>
  );

  return (
    <ConsolePanel
      title="OPEN TASKS"
      status={`${data.tasks.filter((task) => !task.done).length} OPEN`}
      action={viewAll}
      className="h-full"
    >
      {open.length === 0 ? (
        <EmptyState message="no open tasks." />
      ) : (
        <ul className="divide-y divide-[#6ea8ff]/10">
          {open.map((task) => (
            <li key={task.id} className="flex items-center gap-3 py-2 text-xs">
              <span className="w-3.5 h-3.5 rounded-sm border border-[#6ea8ff]/40 shrink-0" aria-hidden="true" />
              <span className="flex-1 min-w-0 truncate text-[#e8eefb]/85">{task.title}</span>
              <span className="hidden sm:inline text-[10px] text-[#e8eefb]/40 truncate max-w-28">
                {projectName(task.projectId)}
              </span>
              <span className="text-[10px] text-[#e8eefb]/55 shrink-0">{task.dueDate ?? "no date"}</span>
            </li>
          ))}
        </ul>
      )}
    </ConsolePanel>
  );
}
