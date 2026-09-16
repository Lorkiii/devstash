"use client";

import React, { useState } from "react";
import { LoaderCircle, Save, X } from "lucide-react";
import { prepareTaskInput } from "@/app/lib/vault-crypto/task";
import { WORKSPACE_FIELD_LIMITS } from "@/app/lib/workspace.types";
import type { TaskFormProps } from "./task-form.types";

const FIELD_CLASS = "min-h-11 w-full rounded-lg border border-accent/25 bg-background/80 px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-subtle-foreground focus:border-accent/70 focus:ring-2 focus:ring-accent/10 disabled:opacity-60";

export function TaskForm({ task, projects, fixedProject, categories, defaultSortOrder, isSaving, requestError, onCancel, onSubmit }: TaskFormProps) {
  const [projectId, setProjectId] = useState(fixedProject?.id ?? task?.projectId ?? "");
  const [categoryId, setCategoryId] = useState(task?.categoryId ?? "");
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [sortOrder, setSortOrder] = useState(task?.sortOrder ?? defaultSortOrder);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    try {
      await onSubmit(prepareTaskInput({
        projectId: (fixedProject?.id ?? projectId) || null,
        categoryId: categoryId || null,
        title,
        description: description || null,
        dueDate: dueDate || null,
        done: task?.done ?? false,
        sortOrder,
      }));
    } catch (error) {
      if (error instanceof Error && error.name === "VaultCryptoValidationError") {
        setValidationError("Check the task fields and size limits, then try again.");
        return;
      }
      throw error;
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-busy={isSaving} className="space-y-4">
        {fixedProject ? (
          <div>
            <span className="mb-1.5 block text-[10px] tracking-widest text-muted-foreground">PROJECT</span>
            <div className="min-h-11 rounded-lg border border-accent/18 bg-background/45 px-3 py-2 text-sm text-foreground/72">{fixedProject.name}</div>
            <span className="mt-1 block text-[10px] text-subtle-foreground">Fixed while managing this project workspace.</span>
          </div>
        ) : (
          <label className="block">
            <span className="mb-1.5 block text-[10px] tracking-widest text-muted-foreground">PROJECT · OPTIONAL</span>
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={isSaving} className={FIELD_CLASS}>
              <option value="">Unassigned</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
        )}
        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-muted-foreground">CATEGORY · OPTIONAL</span>
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={isSaving} className={FIELD_CLASS}>
            <option value="">Uncategorized</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-muted-foreground">TITLE</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={WORKSPACE_FIELD_LIMITS.titleCodePoints} autoComplete="off" autoFocus required disabled={isSaving} className={FIELD_CLASS} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-muted-foreground">DESCRIPTION · OPTIONAL</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={WORKSPACE_FIELD_LIMITS.descriptionCodePoints} autoComplete="off" disabled={isSaving} className={FIELD_CLASS} />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[10px] tracking-widest text-muted-foreground">DUE DATE · ENCRYPTED</span>
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} disabled={isSaving} className={FIELD_CLASS} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] tracking-widest text-muted-foreground">SORT ORDER</span>
            <input type="number" min={0} max={WORKSPACE_FIELD_LIMITS.maximumSortOrder} value={sortOrder} onChange={(event) => setSortOrder(event.target.valueAsNumber)} required disabled={isSaving} className={FIELD_CLASS} />
          </label>
        </div>
        {(validationError || requestError) && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{validationError ?? requestError}</p>}
        <div className="flex flex-col-reverse gap-2 border-t border-accent/15 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-accent/20 px-4 py-2 text-xs tracking-wider text-muted-foreground hover:bg-accent/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <X className="h-3.5 w-3.5" /> CANCEL
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-accent/50 bg-accent/15 px-4 py-2 text-xs font-semibold tracking-wider text-foreground hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isSaving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {task ? "SAVE ENCRYPTED UPDATE" : "CREATE ENCRYPTED TASK"}
          </button>
        </div>
    </form>
  );
}
