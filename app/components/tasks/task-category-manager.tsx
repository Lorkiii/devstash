"use client";

import React, { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { Modal } from "@/app/components/ui/modal";
import { TaskCategoryBadge } from "@/app/components/ui/task-category-badge";
import { useUnlockedVault, useVaultSession } from "@/app/lib/vault-session";
import type { TaskCategoryInput, TaskInput } from "@/app/lib/workspace.types";
import { TaskCategoryForm } from "./task-category-form";

export function TaskCategoryManager() {
  const data = useUnlockedVault();
  const {
    createTaskCategory,
    deleteTaskCategory,
    updateTask,
    updateTaskCategory,
  } = useVaultSession();
  const [formId, setFormId] = useState<"new" | string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const customCategories = data.taskCategories.filter((category) => !category.builtIn);
  const openTasks = data.tasks.filter((task) => !task.done);
  const uncategorizedOpenCount = openTasks.filter((task) => !task.categoryId).length;

  const closeForm = () => {
    setFormId(null);
    setActionError(null);
  };

  const save = async (input: TaskCategoryInput) => {
    setBusyId(formId ?? "new");
    setActionError(null);
    try {
      if (formId === "new") await createTaskCategory(input);
      else if (formId) await updateTaskCategory(formId, input);
      else return;
      setFormId(null);
    } catch {
      setActionError("The encrypted category could not be saved. No plaintext was sent.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (categoryId: string, categoryName: string) => {
    const linkedTasks = data.tasks.filter((task) => task.categoryId === categoryId);
    const taskText = linkedTasks.length === 1 ? "1 linked task" : `${linkedTasks.length} linked tasks`;
    if (!window.confirm(
      `Delete ${categoryName}? ${taskText} will be moved to Uncategorized before the category is deleted.`,
    )) return;

    setBusyId(categoryId);
    setActionError(null);
    try {
      for (const task of linkedTasks) {
        const reassigned: TaskInput = {
          projectId: task.projectId ?? null,
          categoryId: null,
          title: task.title,
          description: task.description ?? null,
          dueDate: task.dueDate ?? null,
          done: task.done,
          sortOrder: task.sortOrder,
        };
        await updateTask(task.id, reassigned);
      }
      await deleteTaskCategory(categoryId);
    } catch {
      setActionError(
        "The category could not be deleted. Any completed task reassignments remain saved.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const selectedCategory = formId && formId !== "new"
    ? customCategories.find((category) => category.id === formId)
    : undefined;

  return (
    <div className="space-y-3">
      <Modal
        isOpen={formId !== null}
        onClose={closeForm}
        title={formId === "new" ? "NEW CATEGORY" : "EDIT CATEGORY"}
        status="NAME + COLOR ENCRYPTED"
        description="Custom category names and palette choices are encrypted locally before saving."
        icon={formId === "new" ? <Plus className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        maxWidth="md"
        closeDisabled={busyId !== null}
      >
        {formId && (
          <TaskCategoryForm
            key={formId}
            category={selectedCategory}
            isSaving={busyId !== null}
            requestError={actionError}
            onCancel={closeForm}
            onSubmit={save}
          />
        )}
      </Modal>
      <ConsolePanel
        title="ALL CATEGORIES"
        status={`${customCategories.length} CUSTOM · ${data.taskCategories.length} TOTAL`}
        tone="tasks"
        surface="flat"
        action={(
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setFormId("new");
            }}
            disabled={busyId !== null}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-emerald-400/30 px-2.5 font-mono text-[9px] tracking-wider text-emerald-800 hover:bg-emerald-400/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 dark:text-emerald-200 sm:min-h-10 sm:px-3 sm:text-[10px]"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> NEW CATEGORY
          </button>
        )}
      >
        <p className="mb-3 text-[11px] leading-4 text-muted-foreground sm:mb-4 sm:text-xs sm:leading-relaxed">
          Built-in and custom labels for the task board. Custom names and colors are encrypted locally.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
          {data.taskCategories.map((category) => {
            const openCount = openTasks.filter((task) => task.categoryId === category.id).length;
            return (
              <li
                key={category.id}
                className="overflow-hidden rounded-xl border border-panel-border bg-surface-muted/80 p-3 sm:p-3.5"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <TaskCategoryBadge category={category} className="min-w-0" />
                    <p className="mt-2 font-mono text-[10px] tracking-wider text-muted-foreground">
                      <span className="text-base font-bold text-foreground">{openCount}</span> open
                      {category.builtIn ? " · built-in" : " · custom"}
                    </p>
                  </div>
                  {!category.builtIn && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setActionError(null);
                          setFormId(category.id);
                        }}
                        disabled={busyId !== null}
                        aria-label="Edit category"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-accent/20 text-muted-foreground hover:border-accent/45 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 sm:h-9 sm:w-9"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(category.id, category.name)}
                        disabled={busyId !== null}
                        aria-label="Delete category"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-rose-400/20 text-rose-700 hover:border-rose-400/45 hover:text-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:opacity-50 dark:text-rose-300 dark:hover:text-rose-200 sm:h-9 sm:w-9"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
          <li className="overflow-hidden rounded-xl border border-dashed border-panel-border bg-transparent p-3 sm:p-3.5">
            <div>
              <TaskCategoryBadge category={null} className="min-w-0" />
              <p className="mt-2 font-mono text-[10px] tracking-wider text-muted-foreground">
                <span className="text-base font-bold text-foreground">{uncategorizedOpenCount}</span> open · unassigned
              </p>
            </div>
          </li>
        </ul>
        {actionError && !formId && (
          <p role="alert" className="mt-2.5 text-[11px] text-rose-700 dark:text-rose-300 sm:mt-3 sm:text-xs">{actionError}</p>
        )}
      </ConsolePanel>
    </div>
  );
}
