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
        title="TASK CATEGORIES"
        status={`${customCategories.length} CUSTOM`}
        surface="flat"
        action={(
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setFormId("new");
            }}
            disabled={busyId !== null}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-accent/30 px-3 font-mono text-[10px] tracking-wider text-accent-strong hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> NEW CATEGORY
          </button>
        )}
      >
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          See open tasks by category. Custom names and colors are encrypted locally.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {data.taskCategories.map((category) => (
            <li key={category.id} className="flex min-w-0 items-center gap-2 rounded-lg border border-panel-border bg-surface-muted p-2">
              <TaskCategoryBadge category={category} className="min-w-0" />
              <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                {openTasks.filter((task) => task.categoryId === category.id).length} open
              </span>
              {!category.builtIn && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setActionError(null);
                      setFormId(category.id);
                    }}
                    disabled={busyId !== null}
                    aria-label="Edit category"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-accent/20 text-muted-foreground hover:border-accent/45 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(category.id, category.name)}
                    disabled={busyId !== null}
                    aria-label="Delete category"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-rose-400/20 text-rose-700 hover:border-rose-400/45 hover:text-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:opacity-50 dark:text-rose-300 dark:hover:text-rose-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </>
              )}
            </li>
          ))}
          <li className="flex min-w-0 items-center gap-2 rounded-lg border border-panel-border bg-surface-muted p-2">
            <TaskCategoryBadge category={null} className="min-w-0" />
            <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
              {uncategorizedOpenCount} open
            </span>
          </li>
        </ul>
        {actionError && !formId && (
          <p role="alert" className="mt-3 text-xs text-rose-700 dark:text-rose-300">{actionError}</p>
        )}
      </ConsolePanel>
    </div>
  );
}
