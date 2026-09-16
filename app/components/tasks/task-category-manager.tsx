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
        action={(
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setFormId("new");
            }}
            disabled={busyId !== null}
            className="inline-flex items-center gap-1 rounded border border-accent/25 px-2 py-1 text-[10px] tracking-widest text-muted-foreground hover:text-accent disabled:opacity-50"
          >
            <Plus className="h-3 w-3" /> CUSTOM
          </button>
        )}
      >
        <p className="mb-3 text-xs leading-relaxed text-subtle-foreground">
          Built-ins remain available. Custom names and palette choices are encrypted in this tab.
        </p>
        <ul className="flex flex-wrap gap-2">
          {data.taskCategories.map((category) => (
            <li key={category.id} className="flex items-center gap-1">
              <TaskCategoryBadge category={category} />
              {!category.builtIn && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setActionError(null);
                      setFormId(category.id);
                    }}
                    disabled={busyId !== null}
                    aria-label={`Edit ${category.name} category`}
                    className="rounded p-1 text-subtle-foreground hover:text-accent disabled:opacity-50"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(category.id, category.name)}
                    disabled={busyId !== null}
                    aria-label={`Delete ${category.name} category`}
                    className="rounded p-1 text-rose-300/60 hover:text-rose-200 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        {actionError && !formId && (
          <p role="alert" className="mt-3 text-xs text-rose-300">{actionError}</p>
        )}
      </ConsolePanel>
    </div>
  );
}
