"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed } from "lucide-react";
import { EmptyState } from "@/app/components/ui/empty-state";
import { TaskCategoryBadge } from "@/app/components/ui/task-category-badge";
import type { VaultData } from "@/app/lib/vault-data.types";

interface OpenTasksPanelProps {
  data: VaultData;
  limit?: number;
}

export function OpenTasksPanel({ data, limit = 5 }: OpenTasksPanelProps) {
  const openTasks = data.tasks
    .filter((task) => !task.done)
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const visibleTasks = openTasks.slice(0, limit);
  const completedTasks = data.tasks.length - openTasks.length;
  const completionPercent = data.tasks.length === 0
    ? 0
    : Math.round((completedTasks / data.tasks.length) * 100);
  const projectName = (projectId?: string) =>
    data.projects.find((project) => project.id === projectId)?.name ?? "Unassigned";
  const taskCategory = (categoryId?: string) =>
    data.taskCategories.find((category) => category.id === categoryId);

  return (
    <section aria-labelledby="focus-queue-title" className="h-full overflow-hidden rounded-xl border border-accent/20 bg-surface/85 shadow-[0_10px_32px_rgba(0,0,0,0.14)]">
      <header className="border-b border-accent/15 px-3 py-3 sm:px-5 sm:py-4">
        <div className="flex items-end justify-between gap-3 sm:gap-4">
          <div>
            <p className="font-mono text-[9px] tracking-[0.2em] text-emerald-300/60">NEXT ACTIONS</p>
            <h2 id="focus-queue-title" className="mt-0.5 text-base font-bold tracking-tight text-foreground sm:mt-1 sm:text-lg">Focus queue</h2>
          </div>
          <div className="text-right">
            <strong className="text-2xl font-black leading-none text-emerald-300 sm:text-3xl">{openTasks.length}</strong>
            <span className="ml-1.5 font-mono text-[9px] tracking-widest text-subtle-foreground">OPEN</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3 sm:mt-4">
          <progress
            aria-label={`${completedTasks} of ${data.tasks.length} tasks completed`}
            className="vault-type-progress h-1.5 w-full rounded-full text-emerald-300"
            max={Math.max(1, data.tasks.length)}
            value={completedTasks}
          />
          <span className="font-mono text-[9px] tracking-widest text-subtle-foreground">{completionPercent}% CLEARED</span>
        </div>
      </header>

      <div className="p-3 sm:p-5">
        {visibleTasks.length === 0 ? (
          <EmptyState
            message="The focus queue is clear."
            hint="Add a task when there is a private next step worth tracking."
            className="flex min-h-32 flex-col justify-center sm:min-h-40"
          />
        ) : (
          <ol className="space-y-1.5 sm:space-y-2">
            {visibleTasks.map((task, index) => (
              <li key={task.id} className="grid grid-cols-[22px_minmax(0,1fr)] gap-2.5 rounded-lg border border-transparent py-2 transition-colors hover:border-accent/10 hover:bg-accent/[0.04] sm:gap-3 sm:py-2.5">
                <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/[0.06] font-mono text-[8px] text-emerald-200/70">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-muted-foreground sm:text-sm">{task.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 sm:mt-1.5">
                    <TaskCategoryBadge category={taskCategory(task.categoryId)} />
                    <span className="max-w-28 truncate font-mono text-[9px] tracking-wider text-subtle-foreground">{projectName(task.projectId)}</span>
                    <span className={`font-mono text-[9px] tracking-wider ${task.dueDate ? "text-accent-strong" : "text-subtle-foreground"}`}>
                      {task.dueDate ?? "NO DATE"}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-accent/10 bg-surface-inset/45 px-3 py-2.5 sm:px-5 sm:py-3">
        <span className="flex items-center gap-2 font-mono text-[9px] tracking-widest text-subtle-foreground">
          {openTasks.length === 0 ? <CheckCircle2 className="h-3 w-3 text-emerald-300" /> : <CircleDashed className="h-3 w-3 text-accent" />}
          {completedTasks} COMPLETED
        </span>
        <Link href="/tasks" className="group inline-flex min-h-9 items-center gap-1.5 font-mono text-[9px] tracking-widest text-accent-strong hover:text-foreground">
          OPEN TASK BOARD
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </footer>
    </section>
  );
}
