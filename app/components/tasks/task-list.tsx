"use client";

import React, { useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { EmptyState } from "@/app/components/ui/empty-state";
import { PageHeading } from "@/app/components/ui/page-heading";
import type { Task } from "@/app/lib/vault-data.types";
import { useUnlockedVault } from "@/app/lib/vault-session";

type ProjectFilter = "ALL" | "NONE" | string;

// Completion toggles are local UI state in this preview; persistence of
// `done` (approved plaintext metadata) arrives with the API phase.
export function TaskList() {
  const data = useUnlockedVault();
  const [tasks, setTasks] = useState<Task[]>(data.tasks);
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>("ALL");
  const [showDone, setShowDone] = useState<boolean>(false);

  const toggle = (id: string) => {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
  };

  const visible = useMemo(
    () =>
      tasks
        .filter((task) => {
          if (projectFilter === "ALL") return true;
          if (projectFilter === "NONE") return !task.projectId;
          return task.projectId === projectFilter;
        })
        .filter((task) => showDone || !task.done)
        .sort((a, b) => {
          if (a.done !== b.done) return a.done ? 1 : -1;
          return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.sortOrder - b.sortOrder;
        }),
    [tasks, projectFilter, showDone]
  );

  const projectName = (projectId?: string) =>
    data.projects.find((project) => project.id === projectId)?.name ?? "unassigned";

  const openCount = tasks.filter((task) => !task.done).length;

  const filterChips: { id: ProjectFilter; label: string }[] = [
    { id: "ALL", label: "ALL" },
    ...data.projects.map((project) => ({ id: project.id, label: project.name.toUpperCase() })),
    { id: "NONE", label: "UNASSIGNED" },
  ];

  const newButton = (
    <button
      type="button"
      disabled
      title="Creation arrives with the ciphertext API phase"
      className="inline-flex items-center gap-1.5 rounded border border-[#6ea8ff]/30 bg-[#0a1220]/70 px-3 py-1.5 font-mono text-xs tracking-wider text-[#e8eefb]/60 disabled:cursor-not-allowed"
    >
      <Plus className="w-3.5 h-3.5" /> NEW TASK
    </button>
  );

  const showDoneToggle = (
    <label className="flex items-center gap-1.5 text-[10px] tracking-widest text-[#e8eefb]/55 cursor-pointer">
      <input
        type="checkbox"
        checked={showDone}
        onChange={(event) => setShowDone(event.target.checked)}
        className="accent-[#6ea8ff]"
      />
      SHOW DONE
    </label>
  );

  return (
    <div className="space-y-4">
      <PageHeading
        eyebrow="TASKS"
        title="Tasks"
        description="Titles and descriptions are encrypted. Completion and sort order are the only plaintext fields."
        actions={newButton}
      />

      <ConsolePanel title="TASK LIST" status={`${openCount} OPEN`} action={showDoneToggle} bodyClassName="p-0">
        <div role="group" aria-label="Filter by project" className="flex flex-wrap gap-1.5 p-3 border-b border-[#6ea8ff]/10">
          {filterChips.map((chip) => {
            const active = projectFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                aria-pressed={active}
                onClick={() => setProjectFilter(chip.id)}
                className={`rounded border px-2 py-1 font-mono text-[10px] tracking-widest transition-colors cursor-pointer ${
                  active
                    ? "bg-[#6ea8ff]/15 border-[#6ea8ff]/50 text-[#e8eefb]"
                    : "border-[#6ea8ff]/15 text-[#e8eefb]/55 hover:text-[#e8eefb] hover:border-[#6ea8ff]/40"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <div className="p-3">
            <EmptyState message="nothing to do here." hint="Toggle SHOW DONE to see completed tasks." />
          </div>
        ) : (
          <ul className="divide-y divide-[#6ea8ff]/10">
            {visible.map((task) => (
              <li key={task.id} className="flex items-start gap-3 px-3 py-2.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={task.done}
                  aria-label={task.done ? "Mark as not done" : "Mark as done"}
                  onClick={() => toggle(task.id)}
                  className={`mt-0.5 w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                    task.done
                      ? "border-emerald-400/70 bg-emerald-400/25 text-emerald-300"
                      : "border-[#6ea8ff]/40 hover:border-[#6ea8ff]"
                  }`}
                >
                  {task.done && <Check className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs ${task.done ? "text-[#e8eefb]/40 line-through" : "text-[#e8eefb]"}`}>
                    {task.title}
                  </div>
                  {task.description && (
                    <p className="text-[11px] text-[#e8eefb]/50 mt-0.5">{task.description}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0 text-[10px] font-mono">
                  <span className="text-[#e8eefb]/45 truncate max-w-32">{projectName(task.projectId)}</span>
                  <span className={task.dueDate ? "text-[#e8eefb]/65" : "text-[#e8eefb]/30"}>
                    {task.dueDate ?? "no date"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ConsolePanel>
    </div>
  );
}
