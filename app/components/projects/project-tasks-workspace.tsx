"use client";

import React, { useMemo, useState } from "react";
import { CalendarDays, CheckSquare2, Pencil, Plus, Trash2 } from "lucide-react";
import { TaskCheckButton } from "@/app/components/tasks/task-check-button";
import { TaskForm } from "@/app/components/tasks/task-form";
import { Modal } from "@/app/components/ui/modal";
import {
  TASK_CATEGORY_COLOR_CLASSES,
  TaskCategoryBadge,
} from "@/app/components/ui/task-category-badge";
import { localIsoDate } from "@/app/components/tasks/task-due";
import type { Project, Task, TaskCategory } from "@/app/lib/vault-data.types";
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

function dueMeta(dueDate?: string) {
  if (!dueDate) return null;
  const today = localIsoDate();
  if (dueDate < today) {
    return { label: `Overdue ${dueDate}`, className: "text-rose-700 dark:text-rose-300" };
  }
  if (dueDate === today) {
    return { label: "Due today", className: "text-amber-800 dark:text-amber-200" };
  }
  return { label: `Due ${dueDate}`, className: "text-muted-foreground" };
}

function categoryChipClass(active: boolean, chipId: CategoryFilter, category?: TaskCategory | null) {
  if (!active) {
    return "border-accent/14 text-subtle-foreground hover:border-accent/35 hover:text-muted-foreground";
  }
  if (chipId === "ALL") return "border-emerald-400/50 bg-emerald-400/12 text-emerald-800 dark:text-emerald-100";
  if (!category) return TASK_CATEGORY_COLOR_CLASSES.slate;
  return TASK_CATEGORY_COLOR_CLASSES[category.colorToken];
}

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
  const categoryFilters: { id: CategoryFilter; label: string; category?: TaskCategory | null }[] = [
    { id: "ALL", label: "ALL" },
    ...data.taskCategories.map((category) => ({ id: category.id, label: category.name, category })),
    { id: "NONE", label: "UNCATEGORIZED", category: null },
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

      <div className="flex flex-col gap-2.5 border-b border-emerald-400/10 bg-emerald-400/[0.02] px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter project tasks by category" className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-1.5">
          <span className="mr-1 text-[8px] tracking-widest text-subtle-foreground sm:text-[9px]">CATEGORY</span>
          {categoryFilters.map((filter) => {
            const active = effectiveCategoryFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={active}
                onClick={() => setCategoryFilter(filter.id)}
                className={`min-h-7 rounded-full border px-2 py-0.5 text-[9px] tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 sm:min-h-9 sm:px-2.5 sm:py-1 sm:text-[10px] ${categoryChipClass(active, filter.id, filter.category)}`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <label className="flex min-h-8 shrink-0 cursor-pointer items-center gap-1.5 text-[9px] tracking-widest text-muted-foreground sm:min-h-10 sm:gap-2 sm:text-[10px]">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(event) => setShowDone(event.target.checked)}
            className="h-3.5 w-3.5 accent-emerald-400 sm:h-4 sm:w-4"
          />
          SHOW COMPLETED
        </label>
      </div>

      {actionError && !formId && <p role="alert" className="border-b border-rose-400/10 px-3 py-2.5 text-xs text-rose-700 dark:text-rose-300 sm:px-5 sm:py-3">{actionError}</p>}

      {visible.length === 0 ? (
        <WorkspaceEmptyState
          message={tasks.length === 0 ? "no tasks for this project." : "no tasks match these filters."}
          hint={tasks.length === 0 ? "Create a task to start planning this project." : "Show completed tasks or choose another category."}
        />
      ) : (
        <ul className="divide-y divide-emerald-400/10">
          {visible.map((task) => {
            const category = taskCategory(task.categoryId);
            const due = dueMeta(task.dueDate);
            return (
              <li key={task.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 px-3 py-2.5 sm:px-5 sm:py-3.5">
                <TaskCheckButton
                  done={task.done}
                  disabled={busyId === task.id}
                  label={task.done ? "Mark as not done" : "Mark as done"}
                  onToggle={() => void toggleTask(task)}
                />

                <div className="min-w-0 flex-1">
                  <div className={`break-words text-[12px] font-semibold sm:text-[13px] ${task.done ? "text-subtle-foreground line-through" : "text-foreground"}`}>
                    {task.title}
                  </div>
                  {task.description && <p className="mt-0.5 line-clamp-2 break-words font-sans text-[11px] leading-4 text-subtle-foreground sm:mt-1 sm:text-xs sm:leading-relaxed">{task.description}</p>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:mt-2 sm:gap-2">
                    <TaskCategoryBadge category={category} />
                    {due ? (
                      <span className={`inline-flex items-center gap-1 font-mono text-[9px] sm:text-[10px] ${due.className}`}>
                        <CalendarDays className="h-3 w-3" aria-hidden="true" /> {due.label}
                      </span>
                    ) : (
                      <span className="text-[9px] text-foreground/28 sm:text-[10px]">no due date</span>
                    )}
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
                    aria-label="Edit task"
                    className={PROJECT_WORKSPACE_ICON_ACTION}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteSelectedTask(task)}
                    disabled={busyId === task.id}
                    aria-label="Delete task"
                    className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-rose-400/20 p-1 text-rose-700/75 transition-colors hover:border-rose-400/45 hover:text-rose-800 dark:text-rose-300/70 dark:hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50 disabled:opacity-50 sm:min-h-10 sm:min-w-10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ProjectWorkspaceShell>
  );
}
