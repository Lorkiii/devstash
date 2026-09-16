"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Modal } from "@/app/components/ui/modal";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const createRequested = searchParams.get("create") === "1";
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
  const activeFormId = formId ?? (createRequested ? "new" : null);
  const formTask = activeFormId && activeFormId !== "new"
    ? tasks.find((task) => task.id === activeFormId)
    : undefined;

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
      className="inline-flex min-h-10 items-center gap-1.5 rounded border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-xs tracking-wider text-foreground hover:bg-accent/20"
    >
      <Plus className="w-3.5 h-3.5" /> NEW TASK
    </button>
  );

  const showDoneToggle = (
    <label className="flex items-center gap-1.5 text-[10px] tracking-widest text-muted-foreground cursor-pointer">
      <input
        type="checkbox"
        checked={showDone}
        onChange={(event) => setShowDone(event.target.checked)}
        className="accent-accent"
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
    setBusyId(activeFormId ?? "new");
    setActionError(null);
    try {
      if (activeFormId === "new") await createTask(input);
      else if (activeFormId) await updateTask(activeFormId, input);
      else return;
      setFormId(null);
      if (createRequested) router.replace("/tasks");
    } catch {
      setActionError("The encrypted task could not be saved. No plaintext was sent.");
    } finally {
      setBusyId(null);
    }
  };

  const closeForm = () => {
    setFormId(null);
    setActionError(null);
    if (createRequested) router.replace("/tasks");
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

      <Modal
        isOpen={activeFormId !== null}
        onClose={closeForm}
        title={activeFormId === "new" ? "NEW TASK" : "EDIT TASK"}
        status="ENCRYPTS IN THIS TAB"
        description="The title, description, due date, and relationships are encrypted locally before saving."
        icon={activeFormId === "new" ? <Plus className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        maxWidth="2xl"
        closeDisabled={busyId !== null}
      >
        {activeFormId && (
          <TaskForm
            key={activeFormId}
            task={formTask}
            projects={data.projects}
            categories={data.taskCategories}
            defaultSortOrder={defaultSortOrder}
            isSaving={busyId !== null}
            requestError={actionError}
            onCancel={closeForm}
            onSubmit={handleSave}
          />
        )}
      </Modal>

      {actionError && !activeFormId && <p role="alert" className="text-xs text-rose-300">{actionError}</p>}

      <TaskCategoryManager />

      <ConsolePanel title="TASK LIST" status={`${openCount} OPEN`} action={showDoneToggle} bodyClassName="p-0">
        <div className="space-y-2.5 p-3 border-b border-accent/10">
          <div role="group" aria-label="Filter tasks by project" className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[9px] tracking-widest text-subtle-foreground">PROJECT</span>
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
                      ? "bg-accent/15 border-accent/50 text-foreground"
                      : "border-accent/15 text-muted-foreground hover:text-foreground hover:border-accent/40"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
          <div role="group" aria-label="Filter tasks by category" className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[9px] tracking-widest text-subtle-foreground">CATEGORY</span>
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
                      ? "bg-accent/15 border-accent/50 text-foreground"
                      : "border-accent/15 text-muted-foreground hover:text-foreground hover:border-accent/40"
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
          <ul className="divide-y divide-accent/10">
            {visible.map((task) => (
              <li key={task.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 px-3 py-2.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={task.done}
                  aria-label={task.done ? "Mark as not done" : "Mark as done"}
                  onClick={() => void toggle(task)}
                  disabled={busyId === task.id}
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors cursor-pointer ${
                    task.done
                      ? "border-emerald-400/70 bg-emerald-400/25 text-emerald-300"
                      : "border-accent/40 hover:border-accent"
                  }`}
                >
                  {task.done && <Check className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs ${task.done ? "text-subtle-foreground line-through" : "text-foreground"}`}>
                    {task.title}
                  </div>
                  {task.description && (
                    <p className="mt-0.5 break-words text-[11px] text-subtle-foreground">{task.description}</p>
                  )}
                  <TaskCategoryBadge category={taskCategory(task.categoryId)} className="mt-1" />
                </div>
                <div className="order-4 ml-7 flex w-[calc(100%_-_1.75rem)] items-center justify-between gap-2 font-mono text-[10px] sm:order-none sm:ml-0 sm:w-auto sm:shrink-0 sm:flex-col sm:items-end sm:justify-start sm:gap-0.5">
                  <span className="text-subtle-foreground truncate max-w-32">{projectName(task.projectId)}</span>
                  <span className={task.dueDate ? "text-muted-foreground" : "text-subtle-foreground"}>
                    {task.dueDate ?? "no date"}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActionError(null);
                      setFormId(task.id);
                      touchRecent("task", task.id);
                    }}
                    disabled={busyId === task.id}
                    aria-label="Edit task"
                    className="inline-flex min-h-10 min-w-10 items-center justify-center rounded border border-accent/20 p-1 text-muted-foreground hover:text-accent disabled:opacity-50"
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
                    className="inline-flex min-h-10 min-w-10 items-center justify-center rounded border border-rose-400/20 p-1 text-rose-300/65 hover:text-rose-200 disabled:opacity-50"
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
