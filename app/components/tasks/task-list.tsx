"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, CheckSquare2, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Modal } from "@/app/components/ui/modal";
import { PageHeading } from "@/app/components/ui/page-heading";
import { ProjectBadge } from "@/app/components/ui/project-badge";
import {
  TASK_CATEGORY_COLOR_CLASSES,
  TaskCategoryBadge,
} from "@/app/components/ui/task-category-badge";
import { localIsoDate } from "./task-due";
import type { Task, TaskCategory } from "@/app/lib/vault-data.types";
import { useUnlockedVault, useVaultSession } from "@/app/lib/vault-session";
import type { TaskInput } from "@/app/lib/workspace.types";
import { TaskCheckButton } from "./task-check-button";
import { TaskForm } from "./task-form";
import { TaskCategoryManager } from "./task-category-manager";

type ProjectFilter = "ALL" | "NONE" | string;
type CategoryFilter = "ALL" | "NONE" | string;
type BoardView = "tasks" | "categories";

const BOARD_TABS: { id: BoardView; label: string }[] = [
  { id: "tasks", label: "TASK BOARD" },
  { id: "categories", label: "CATEGORIES" },
];

function dueMeta(dueDate?: string) {
  if (!dueDate) return null;
  const today = localIsoDate();
  if (dueDate < today) {
    return {
      label: `Overdue ${dueDate}`,
      className: "border-rose-400/35 bg-rose-400/10 text-rose-800 dark:text-rose-200",
    };
  }
  if (dueDate === today) {
    return {
      label: "Due today",
      className: "border-amber-400/40 bg-amber-400/12 text-amber-800 dark:text-amber-200",
    };
  }
  return {
    label: `Due ${dueDate}`,
    className: "border-panel-border bg-surface-muted text-muted-foreground",
  };
}

function categoryChipClass(active: boolean, chipId: CategoryFilter, category?: TaskCategory | null) {
  if (!active) {
    return "border-accent/14 bg-transparent text-subtle-foreground hover:border-accent/35 hover:text-muted-foreground";
  }
  if (chipId === "ALL") return "border-emerald-400/50 bg-emerald-400/12 text-emerald-800 dark:text-emerald-100";
  if (!category) return TASK_CATEGORY_COLOR_CLASSES.slate;
  return TASK_CATEGORY_COLOR_CLASSES[category.colorToken];
}

export function TaskList() {
  const data = useUnlockedVault();
  const { createTask, deleteTask, touchRecent, updateTask } = useVaultSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const createRequested = searchParams.get("create") === "1";
  const tasks = data.tasks;
  const [boardView, setBoardView] = useState<BoardView>("tasks");
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
  const categoryChips: { id: CategoryFilter; label: string; category?: TaskCategory | null }[] = [
    { id: "ALL", label: "All" },
    ...data.taskCategories.map((category) => ({ id: category.id, label: category.name, category })),
    { id: "NONE", label: "Uncategorized", category: null },
  ];

  const newButton = (
    <button
      type="button"
      onClick={() => {
        setBoardView("tasks");
        setActionError(null);
        setFormId("new");
      }}
      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded border border-accent/40 bg-accent/10 px-2.5 py-1.5 font-mono text-[11px] tracking-wider text-foreground hover:bg-accent/20 sm:min-h-10 sm:px-3 sm:text-xs"
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

  const moveBoardFocus = (currentIndex: number, key: string) => {
    let nextIndex = currentIndex;
    if (key === "ArrowRight") nextIndex = (currentIndex + 1) % BOARD_TABS.length;
    else if (key === "ArrowLeft") nextIndex = (currentIndex - 1 + BOARD_TABS.length) % BOARD_TABS.length;
    else if (key === "Home") nextIndex = 0;
    else if (key === "End") nextIndex = BOARD_TABS.length - 1;
    else return;

    const nextTab = BOARD_TABS[nextIndex];
    setBoardView(nextTab.id);
    window.requestAnimationFrame(() => document.getElementById(`task-board-tab-${nextTab.id}`)?.focus());
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <PageHeading
        eyebrow="TASKS"
        title="Tasks"
        description="Titles and descriptions are encrypted. Completion and sort order are the only plaintext fields."
        actions={boardView === "tasks" ? newButton : undefined}
      />

      <div
        role="tablist"
        aria-label="Task workspace"
        className="inline-flex w-full rounded-xl border border-emerald-400/15 bg-emerald-400/[0.03] p-1 sm:w-auto"
      >
        {BOARD_TABS.map((tab, index) => {
          const active = boardView === tab.id;
          return (
            <button
              key={tab.id}
              id={`task-board-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-controls={tab.id === "tasks" ? "task-board-panel" : "task-categories-panel"}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setBoardView(tab.id)}
              onKeyDown={(event) => {
                if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                  event.preventDefault();
                  moveBoardFocus(index, event.key);
                }
              }}
              className={`inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 font-mono text-[10px] tracking-widest transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:min-h-10 sm:flex-none sm:px-4 sm:text-[11px] ${
                active
                  ? "bg-panel text-emerald-800 shadow-sm dark:text-emerald-100"
                  : "text-subtle-foreground hover:text-foreground"
              }`}
            >
              {tab.id === "tasks" ? <CheckSquare2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Tags className="h-3.5 w-3.5" aria-hidden="true" />}
              {tab.label}
              {tab.id === "categories" && (
                <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[9px] text-emerald-800 dark:text-emerald-200">
                  {data.taskCategories.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

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

      {actionError && !activeFormId && boardView === "tasks" && (
        <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{actionError}</p>
      )}

      {boardView === "categories" ? (
        <div id="task-categories-panel" role="tabpanel" aria-labelledby="task-board-tab-categories">
          <TaskCategoryManager />
        </div>
      ) : (
        <ConsolePanel
          title="TASK BOARD"
          status={`${openCount} OPEN · ${tasks.length} TOTAL`}
          tone="tasks"
          surface="flat"
          bodyClassName="p-0"
        >
          <div id="task-board-panel" role="tabpanel" aria-labelledby="task-board-tab-tasks">
            <div className="border-b border-emerald-400/10 bg-emerald-400/[0.02] p-2.5 sm:p-4">
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-end">
                <label className="min-w-0 flex-1 space-y-1 sm:space-y-1.5">
                  <span className="block font-mono text-[9px] tracking-widest text-muted-foreground sm:text-[10px]">PROJECT</span>
                  <select
                    value={effectiveProjectFilter}
                    onChange={(event) => setProjectFilter(event.target.value)}
                    className="min-h-9 w-full rounded-lg border border-panel-border bg-panel px-2.5 text-[13px] text-foreground outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 sm:min-h-11 sm:px-3 sm:text-sm"
                  >
                    {projectOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </label>
                <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-panel-border bg-panel px-2.5 text-[13px] text-foreground sm:min-h-11 sm:px-3 sm:text-sm">
                  <input
                    type="checkbox"
                    checked={showDone}
                    onChange={(event) => setShowDone(event.target.checked)}
                    className="h-3.5 w-3.5 accent-emerald-500 sm:h-4 sm:w-4"
                  />
                  Show done
                </label>
              </div>

              <div className="mt-3" role="group" aria-label="Filter tasks by category">
                <span className="mb-1.5 block font-mono text-[9px] tracking-widest text-muted-foreground sm:text-[10px]">CATEGORY</span>
                <div className="flex flex-wrap gap-1 sm:gap-1.5">
                  {categoryChips.map((chip) => {
                    const active = effectiveCategoryFilter === chip.id;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setCategoryFilter(chip.id)}
                        className={`min-h-8 rounded-full border px-2.5 font-mono text-[10px] tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:min-h-9 sm:px-3 ${categoryChipClass(active, chip.id, chip.category)}`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground sm:mt-3 sm:text-xs">
                <span role="status">Showing {visible.length} of {tasks.length} tasks</span>
                {filtersActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setProjectFilter("ALL");
                      setCategoryFilter("ALL");
                      setShowDone(false);
                    }}
                    className="min-h-8 rounded-md border border-emerald-400/25 px-2.5 font-mono text-[9px] tracking-wider text-emerald-800 hover:bg-emerald-400/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:text-emerald-200 sm:min-h-10 sm:px-3 sm:text-[10px]"
                  >
                    RESET FILTERS
                  </button>
                )}
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="p-3 sm:p-4">
                {tasks.length === 0 ? (
                  <EmptyState message="No tasks yet." hint="Create a task to get started." />
                ) : openCount === 0 && !showDone && !filtersActive ? (
                  <EmptyState message="All tasks are complete." hint="Turn on Show done to view them." />
                ) : (
                  <EmptyState message="No tasks match these filters." hint="Adjust the filters or reset them." />
                )}
              </div>
            ) : (
              <ul className="divide-y divide-emerald-400/10">
                {visible.map((task) => {
                  const assignedProject = projectName(task.projectId);
                  const category = taskCategory(task.categoryId);
                  const due = dueMeta(task.dueDate);
                  return (
                    <li
                      key={task.id}
                      className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 px-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-5 sm:py-3.5"
                    >
                      <TaskCheckButton
                        done={task.done}
                        disabled={busyId === task.id}
                        label={task.done ? "Mark as not done" : "Mark as done"}
                        onToggle={() => void toggle(task)}
                      />
                      <div className="min-w-0">
                        <div className={`break-words text-[13px] font-semibold leading-5 sm:text-sm ${task.done ? "text-subtle-foreground line-through" : "text-foreground"}`}>
                          {task.title}
                        </div>
                        {task.description && (
                          <p className="mt-0.5 line-clamp-2 break-words font-sans text-[11px] leading-4 text-muted-foreground sm:mt-1 sm:text-xs sm:leading-5">{task.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-1 sm:gap-1.5">
                          <TaskCategoryBadge category={category} />
                          {assignedProject && <ProjectBadge name={assignedProject} />}
                          {due && (
                            <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[9px] leading-4 sm:px-2 sm:text-[10px] ${due.className}`}>
                              <CalendarDays className="h-3 w-3" aria-hidden="true" /> {due.label}
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
                          className="inline-flex min-h-8 items-center gap-1 rounded-md border border-emerald-400/20 px-2 font-mono text-[9px] tracking-wider text-muted-foreground hover:border-emerald-400/45 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 dark:hover:text-emerald-200 sm:min-h-10 sm:gap-1.5 sm:px-2.5 sm:text-[10px]"
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
                          className="inline-flex min-h-8 items-center gap-1 rounded-md border border-rose-400/20 px-2 font-mono text-[9px] tracking-wider text-rose-700 hover:border-rose-400/45 hover:text-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:opacity-50 dark:text-rose-300 dark:hover:text-rose-200 sm:min-h-10 sm:gap-1.5 sm:px-2.5 sm:text-[10px]"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> DELETE
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </ConsolePanel>
      )}
    </div>
  );
}
