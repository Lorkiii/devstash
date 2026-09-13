"use client";

import React, { useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { EmptyState } from "@/app/components/ui/empty-state";
import { PageHeading } from "@/app/components/ui/page-heading";
import { TaskCategoryBadge } from "@/app/components/ui/task-category-badge";
import type { Task } from "@/app/lib/vault-data.types";
import { useUnlockedVault, useVaultSession } from "@/app/lib/vault-session";
import type { TaskInput } from "@/app/lib/workspace.types";
import { TaskForm } from "./task-form";
import { TaskCategoryManager } from "./task-category-manager";

type ProjectFilter = "ALL" | "NONE" | string;
type CategoryFilter = "ALL" | "NONE" | string;

export function TaskList() {
  const data = useUnlockedVault();
  const { createTask, deleteTask, touchRecent, updateTask } = useVaultSession();
  const tasks = data.tasks;
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [showDone, setShowDone] = useState<boolean>(false);
  const [formId, setFormId] = useState<"new" | string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const effectiveCategoryFilter = categoryFilter === "ALL" || categoryFilter === "NONE" ||
    data.taskCategories.some((category) => category.id === categoryFilter)
    ? categoryFilter
    : "ALL";

  const visible = useMemo(
    () =>
      tasks
        .filter((task) => {
          if (projectFilter === "ALL") return true;
          if (projectFilter === "NONE") return !task.projectId;
          return task.projectId === projectFilter;
        })
        .filter((task) => {
          if (effectiveCategoryFilter === "ALL") return true;
          if (effectiveCategoryFilter === "NONE") return !task.categoryId;
          return task.categoryId === effectiveCategoryFilter;
        })
        .filter((task) => showDone || !task.done)
        .sort((a, b) => {
          if (a.done !== b.done) return a.done ? 1 : -1;
          return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.sortOrder - b.sortOrder;
        }),
    [tasks, projectFilter, effectiveCategoryFilter, showDone]
  );

  const projectName = (projectId?: string) =>
    data.projects.find((project) => project.id === projectId)?.name ?? "unassigned";
  const taskCategory = (categoryId?: string) =>
    data.taskCategories.find((category) => category.id === categoryId) ?? null;

  const openCount = tasks.filter((task) => !task.done).length;
  const defaultSortOrder = Math.min(
    Math.max(0, ...tasks.map((task) => task.sortOrder)) + 1,
    1_000_000,
  );

  const filterChips: { id: ProjectFilter; label: string }[] = [
    { id: "ALL", label: "ALL" },
    ...data.projects.map((project) => ({ id: project.id, label: project.name.toUpperCase() })),
    { id: "NONE", label: "UNASSIGNED" },
  ];
  const categoryFilterChips: { id: CategoryFilter; label: string }[] = [
    { id: "ALL", label: "ALL" },
    ...data.taskCategories.map((category) => ({ id: category.id, label: category.name })),
    { id: "NONE", label: "UNCATEGORIZED" },
  ];

  const newButton = (
    <button
      type="button"
      onClick={() => {
        setActionError(null);
        setFormId("new");
      }}
      className="inline-flex items-center gap-1.5 rounded border border-[#6ea8ff]/40 bg-[#6ea8ff]/10 px-3 py-1.5 font-mono text-xs tracking-wider text-[#e8eefb] hover:bg-[#6ea8ff]/20"
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

  const inputForTask = (task: Task, done = task.done): TaskInput => ({
    projectId: task.projectId ?? null,
    categoryId: task.categoryId ?? null,
    title: task.title,
    description: task.description ?? null,
    dueDate: task.dueDate ?? null,
    done,
    sortOrder: task.sortOrder,
  });

  const handleSave = async (input: TaskInput) => {
    setBusyId(formId ?? "new");
    setActionError(null);
    try {
      if (formId === "new") await createTask(input);
      else if (formId) await updateTask(formId, input);
      else return;
      setFormId(null);
    } catch {
      setActionError("The encrypted task could not be saved. No plaintext was sent.");
    } finally {
      setBusyId(null);
    }
  };

  const toggle = async (task: Task) => {
    setBusyId(task.id);
    setActionError(null);
    try {
      await updateTask(task.id, inputForTask(task, !task.done));
      touchRecent("task", task.id);
    } catch {
      setActionError("The encrypted task could not be updated.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeading
        eyebrow="TASKS"
        title="Tasks"
        description="Titles and descriptions are encrypted. Completion and sort order are the only plaintext fields."
        actions={newButton}
      />

      {formId && (
        <TaskForm
          key={formId}
          task={formId === "new" ? undefined : tasks.find((task) => task.id === formId)}
          projects={data.projects}
          categories={data.taskCategories}
          defaultSortOrder={defaultSortOrder}
          isSaving={busyId !== null}
          requestError={actionError}
          onCancel={() => {
            setFormId(null);
            setActionError(null);
          }}
          onSubmit={handleSave}
        />
      )}

      {actionError && !formId && <p role="alert" className="text-xs text-rose-300">{actionError}</p>}

      <TaskCategoryManager />

      <ConsolePanel title="TASK LIST" status={`${openCount} OPEN`} action={showDoneToggle} bodyClassName="p-0">
        <div className="space-y-2.5 p-3 border-b border-[#6ea8ff]/10">
          <div role="group" aria-label="Filter tasks by project" className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[9px] tracking-widest text-[#e8eefb]/35">PROJECT</span>
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
          <div role="group" aria-label="Filter tasks by category" className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[9px] tracking-widest text-[#e8eefb]/35">CATEGORY</span>
            {categoryFilterChips.map((chip) => {
              const active = effectiveCategoryFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategoryFilter(chip.id)}
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
                  onClick={() => void toggle(task)}
                  disabled={busyId === task.id}
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
                  <TaskCategoryBadge category={taskCategory(task.categoryId)} className="mt-1" />
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0 text-[10px] font-mono">
                  <span className="text-[#e8eefb]/45 truncate max-w-32">{projectName(task.projectId)}</span>
                  <span className={task.dueDate ? "text-[#e8eefb]/65" : "text-[#e8eefb]/30"}>
                    {task.dueDate ?? "no date"}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActionError(null);
                      setFormId(task.id);
                      touchRecent("task", task.id);
                    }}
                    disabled={busyId === task.id}
                    aria-label="Edit task"
                    className="rounded border border-[#6ea8ff]/20 p-1 text-[#e8eefb]/60 hover:text-[#6ea8ff] disabled:opacity-50"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm("Permanently delete this encrypted task? This cannot be undone.")) return;
                      setBusyId(task.id);
                      setActionError(null);
                      void deleteTask(task.id)
                        .catch(() => setActionError("The encrypted task could not be deleted."))
                        .finally(() => setBusyId(null));
                    }}
                    disabled={busyId === task.id}
                    aria-label="Delete task"
                    className="rounded border border-rose-400/20 p-1 text-rose-300/65 hover:text-rose-200 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ConsolePanel>
    </div>
  );
}
