"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Modal } from "@/app/components/ui/modal";
import { PageHeading } from "@/app/components/ui/page-heading";
import { ProjectBadge } from "@/app/components/ui/project-badge";
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
  const effectiveProjectFilter = projectFilter === "ALL" || projectFilter === "NONE" ||
    data.projects.some((project) => project.id === projectFilter)
    ? projectFilter
    : "ALL";
  const effectiveCategoryFilter = categoryFilter === "ALL" || categoryFilter === "NONE" ||
    data.taskCategories.some((category) => category.id === categoryFilter)
    ? categoryFilter
    : "ALL";

  const visible = useMemo(
    () =>
      tasks
        .filter((task) => {
          if (effectiveProjectFilter === "ALL") return true;
          if (effectiveProjectFilter === "NONE") return !task.projectId;
          return task.projectId === effectiveProjectFilter;
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
    [tasks, effectiveProjectFilter, effectiveCategoryFilter, showDone]
  );

  const projectName = (projectId?: string) =>
    data.projects.find((project) => project.id === projectId)?.name;
  const taskCategory = (categoryId?: string) =>
    data.taskCategories.find((category) => category.id === categoryId) ?? null;
  const activeFormId = formId ?? (createRequested ? "new" : null);
  const formTask = activeFormId && activeFormId !== "new"
    ? tasks.find((task) => task.id === activeFormId)
    : undefined;

  const openCount = tasks.filter((task) => !task.done).length;
  const filtersActive = effectiveProjectFilter !== "ALL" || effectiveCategoryFilter !== "ALL" || showDone;
  const defaultSortOrder = Math.min(
    Math.max(0, ...tasks.map((task) => task.sortOrder)) + 1,
    1_000_000,
  );

  const projectOptions: { id: ProjectFilter; label: string }[] = [
    { id: "ALL", label: "All projects" },
    ...data.projects.map((project) => ({ id: project.id, label: project.name })),
    { id: "NONE", label: "Unassigned" },
  ];
  const categoryOptions: { id: CategoryFilter; label: string }[] = [
    { id: "ALL", label: "All categories" },
    ...data.taskCategories.map((category) => ({ id: category.id, label: category.name })),
    { id: "NONE", label: "Uncategorized" },
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

      {actionError && !activeFormId && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{actionError}</p>}

      <TaskCategoryManager />

      <ConsolePanel title="TASK LIST" status={`${openCount} OPEN`} surface="flat" bodyClassName="p-0">
        <div className="border-b border-accent/15 bg-surface-muted/50 p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            <label className="min-w-0 space-y-1.5">
              <span className="block font-mono text-[10px] tracking-widest text-muted-foreground">PROJECT</span>
              <select
                value={effectiveProjectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
                className="min-h-11 w-full rounded-lg border border-panel-border bg-panel px-3 text-sm text-foreground outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                {projectOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="min-w-0 space-y-1.5">
              <span className="block font-mono text-[10px] tracking-widest text-muted-foreground">CATEGORY</span>
              <select
                value={effectiveCategoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="min-h-11 w-full rounded-lg border border-panel-border bg-panel px-3 text-sm text-foreground outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                {categoryOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-panel-border bg-panel px-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={showDone}
                onChange={(event) => setShowDone(event.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              Show done
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span role="status">Showing {visible.length} of {tasks.length} tasks</span>
            {filtersActive && (
              <button
                type="button"
                onClick={() => {
                  setProjectFilter("ALL");
                  setCategoryFilter("ALL");
                  setShowDone(false);
                }}
                className="min-h-10 rounded-md border border-accent/25 px-3 font-mono text-[10px] tracking-wider text-accent-strong hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                RESET FILTERS
              </button>
            )}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="p-4">
            {tasks.length === 0 ? (
              <EmptyState message="No tasks yet." hint="Create a task to get started." />
            ) : openCount === 0 && !showDone && !filtersActive ? (
              <EmptyState message="All tasks are complete." hint="Turn on Show done to view them." />
            ) : (
              <EmptyState message="No tasks match these filters." hint="Adjust the filters or reset them." />
            )}
          </div>
        ) : (
          <ul className="divide-y divide-accent/10">
            {visible.map((task) => {
              const assignedProject = projectName(task.projectId);
              return (
                <li key={task.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 px-3 py-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:px-4">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={task.done}
                    aria-label={task.done ? "Mark as not done" : "Mark as done"}
                    onClick={() => void toggle(task)}
                    disabled={busyId === task.id}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/25 text-muted-foreground hover:border-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
                  >
                    <span className={`flex h-5 w-5 items-center justify-center rounded border ${task.done ? "border-emerald-400/70 bg-emerald-400/25 text-emerald-700 dark:text-emerald-300" : "border-accent/40"}`}>
                      {task.done && <Check className="h-3 w-3" />}
                    </span>
                  </button>
                  <div className="min-w-0 self-center">
                    <div className={`break-words text-sm font-medium leading-5 ${task.done ? "text-subtle-foreground line-through" : "text-foreground"}`}>
                      {task.title}
                    </div>
                    {task.description && (
                      <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{task.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <TaskCategoryBadge category={taskCategory(task.categoryId)} />
                      {assignedProject && <ProjectBadge name={assignedProject} />}
                      {task.dueDate && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-panel-border bg-surface-muted px-2 py-0.5 font-mono text-[10px] leading-4 text-muted-foreground">
                          <CalendarDays className="h-3 w-3" aria-hidden="true" /> Due {task.dueDate}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-start-2 flex items-center gap-1.5 sm:col-start-3 sm:row-start-1 sm:self-start">
                    <button
                      type="button"
                      onClick={() => {
                        setActionError(null);
                        setFormId(task.id);
                        touchRecent("task", task.id);
                      }}
                      disabled={busyId === task.id}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-accent/20 px-2.5 font-mono text-[10px] tracking-wider text-muted-foreground hover:border-accent/45 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> EDIT
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
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-rose-400/20 px-2.5 font-mono text-[10px] tracking-wider text-rose-700 hover:border-rose-400/45 hover:text-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:opacity-50 dark:text-rose-300 dark:hover:text-rose-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> DELETE
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ConsolePanel>
    </div>
  );
}
