"use client";

import React, { useMemo, useState } from "react";
import { Check, CheckSquare2, Pencil, Plus, Trash2 } from "lucide-react";
import { TaskForm } from "@/app/components/tasks/task-form";
import { Modal } from "@/app/components/ui/modal";
import { TaskCategoryBadge } from "@/app/components/ui/task-category-badge";
import type { Project, Task } from "@/app/lib/vault-data.types";
import { useUnlockedVault, useVaultSession } from "@/app/lib/vault-session";
import type { TaskInput } from "@/app/lib/workspace.types";
import {
  PROJECT_WORKSPACE_ICON_ACTION,
  PROJECT_WORKSPACE_PRIMARY_ACTION,
  ProjectWorkspaceShell,
  WorkspaceEmptyState,
  type ProjectWorkspaceTab,
} from "./project-workspace-shell";

type CategoryFilter = "ALL" | "NONE" | string;

interface ProjectTasksWorkspaceProps {
  project: Project;
  counts: Record<ProjectWorkspaceTab, number>;
  onTabChange: (tab: ProjectWorkspaceTab) => void;
}

export function ProjectTasksWorkspace({ project, counts, onTabChange }: ProjectTasksWorkspaceProps) {
  const data = useUnlockedVault();
  const { createTask, deleteTask, touchRecent, updateTask } = useVaultSession();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [showDone, setShowDone] = useState(false);
  const [formId, setFormId] = useState<"new" | string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const tasks = useMemo(
    () => data.tasks.filter((task) => task.projectId === project.id),
    [data.tasks, project.id],
  );
  const effectiveCategoryFilter = categoryFilter === "ALL" || categoryFilter === "NONE" ||
    data.taskCategories.some((category) => category.id === categoryFilter)
    ? categoryFilter
    : "ALL";
  const visible = useMemo(
    () => tasks
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
    [tasks, effectiveCategoryFilter, showDone],
  );
  const openCount = tasks.filter((task) => !task.done).length;
  const defaultSortOrder = Math.min(
    Math.max(0, ...data.tasks.map((task) => task.sortOrder)) + 1,
    1_000_000,
  );
  const formTask = formId && formId !== "new"
    ? tasks.find((task) => task.id === formId)
    : undefined;
  const taskCategory = (categoryId?: string) =>
    data.taskCategories.find((category) => category.id === categoryId) ?? null;
  const categoryFilters: { id: CategoryFilter; label: string }[] = [
    { id: "ALL", label: "ALL" },
    ...data.taskCategories.map((category) => ({ id: category.id, label: category.name })),
    { id: "NONE", label: "UNCATEGORIZED" },
  ];

  const inputForTask = (task: Task, done = task.done): TaskInput => ({
    projectId: project.id,
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

  const toggleTask = async (task: Task) => {
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

  const deleteSelectedTask = async (task: Task) => {
    if (!window.confirm("Permanently delete this encrypted task? This cannot be undone.")) return;

    setBusyId(task.id);
    setActionError(null);
    try {
      await deleteTask(task.id);
    } catch {
      setActionError("The encrypted task could not be deleted.");
    } finally {
      setBusyId(null);
    }
  };

  const action = (
    <button
      type="button"
      onClick={() => {
        setActionError(null);
        setFormId("new");
      }}
      className={PROJECT_WORKSPACE_PRIMARY_ACTION}
    >
      <Plus className="h-3.5 w-3.5" /> NEW TASK
    </button>
  );

  return (
    <ProjectWorkspaceShell
      activeTab="tasks"
      counts={counts}
      status={`${openCount} OPEN · ${tasks.length} TOTAL`}
      action={action}
      onTabChange={onTabChange}
    >
      <Modal
        isOpen={formId !== null}
        onClose={() => {
          setFormId(null);
          setActionError(null);
        }}
        title={formId === "new" ? "NEW TASK" : "EDIT TASK"}
        status="ENCRYPTS IN THIS TAB"
        description="This task stays linked to the current project and is encrypted locally before saving."
        icon={<CheckSquare2 className="h-4 w-4" />}
        maxWidth="2xl"
        closeDisabled={busyId !== null}
      >
        {formId && (
          <TaskForm
            key={formId}
            task={formTask}
            projects={data.projects}
            fixedProject={project}
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
      </Modal>

      <div className="flex flex-col gap-3 border-b border-accent/10 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter project tasks by category" className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[9px] tracking-widest text-subtle-foreground">CATEGORY</span>
          {categoryFilters.map((filter) => {
            const active = effectiveCategoryFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={active}
                onClick={() => setCategoryFilter(filter.id)}
                className={`min-h-9 rounded-lg border px-2.5 py-1 text-[10px] tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 ${
                  active
                    ? "border-emerald-400/45 bg-emerald-400/10 text-emerald-800 dark:text-emerald-100"
                    : "border-accent/14 text-subtle-foreground hover:border-accent/35 hover:text-muted-foreground"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <label className="flex min-h-10 shrink-0 cursor-pointer items-center gap-2 text-[10px] tracking-widest text-muted-foreground">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(event) => setShowDone(event.target.checked)}
            className="h-4 w-4 accent-emerald-400"
          />
          SHOW COMPLETED
        </label>
      </div>

      {actionError && !formId && <p role="alert" className="border-b border-rose-400/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-300 sm:px-5">{actionError}</p>}

      {visible.length === 0 ? (
        <WorkspaceEmptyState
          message={tasks.length === 0 ? "no tasks for this project." : "no tasks match these filters."}
          hint={tasks.length === 0 ? "Create a task to start planning this project." : "Show completed tasks or choose another category."}
        />
      ) : (
        <ul className="divide-y divide-accent/10">
          {visible.map((task) => (
            <li key={task.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
              <button
                type="button"
                role="checkbox"
                aria-checked={task.done}
                aria-label={task.done ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
                onClick={() => void toggleTask(task)}
                disabled={busyId === task.id}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/55 ${
                  task.done
                    ? "border-emerald-400/70 bg-emerald-400/25 text-emerald-700 dark:text-emerald-200"
                    : "border-accent/40 hover:border-emerald-400/70"
                } disabled:opacity-50`}
              >
                {task.done && <Check className="h-3.5 w-3.5" />}
              </button>

              <div className="min-w-0 flex-1">
                <div className={`break-words text-xs ${task.done ? "text-subtle-foreground line-through" : "text-foreground"}`}>
                  {task.title}
                </div>
                {task.description && <p className="mt-1 break-words font-sans text-xs leading-relaxed text-subtle-foreground">{task.description}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <TaskCategoryBadge category={taskCategory(task.categoryId)} />
                  <span className={`text-[10px] ${task.dueDate ? "text-muted-foreground" : "text-foreground/28"}`}>
                    {task.dueDate ?? "no due date"}
                  </span>
                </div>
              </div>

              <div className="ml-8 flex shrink-0 items-center gap-1 sm:ml-0">
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setFormId(task.id);
                    touchRecent("task", task.id);
                  }}
                  disabled={busyId === task.id}
                  aria-label={`Edit ${task.title}`}
                  className={PROJECT_WORKSPACE_ICON_ACTION}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void deleteSelectedTask(task)}
                  disabled={busyId === task.id}
                  aria-label={`Delete ${task.title}`}
                  className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-rose-400/20 p-1 text-rose-700/75 transition-colors hover:border-rose-400/45 hover:text-rose-800 dark:text-rose-300/70 dark:hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ProjectWorkspaceShell>
  );
}
