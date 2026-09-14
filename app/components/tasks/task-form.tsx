"use client";

import React, { useState } from "react";
import { LoaderCircle, Save, X } from "lucide-react";
import { prepareTaskInput } from "@/app/lib/vault-crypto/task";
import { WORKSPACE_FIELD_LIMITS } from "@/app/lib/workspace.types";
import type { TaskFormProps } from "./task-form.types";

const FIELD_CLASS = "min-h-11 w-full rounded-lg border border-[#6ea8ff]/25 bg-[#05070d]/80 px-3 py-2 font-mono text-sm text-[#e8eefb] outline-none placeholder:text-[#e8eefb]/25 focus:border-[#6ea8ff]/70 focus:ring-2 focus:ring-[#6ea8ff]/10 disabled:opacity-60";

export function TaskForm({ task, projects, categories, defaultSortOrder, isSaving, requestError, onCancel, onSubmit }: TaskFormProps) {
  const [projectId, setProjectId] = useState(task?.projectId ?? "");
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
        projectId: projectId || null,
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
        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-[#e8eefb]/55">PROJECT · OPTIONAL</span>
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={isSaving} className={FIELD_CLASS}>
            <option value="">Unassigned</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-[#e8eefb]/55">CATEGORY · OPTIONAL</span>
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={isSaving} className={FIELD_CLASS}>
            <option value="">Uncategorized</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-[#e8eefb]/55">TITLE</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={WORKSPACE_FIELD_LIMITS.titleCodePoints} autoComplete="off" autoFocus required disabled={isSaving} className={FIELD_CLASS} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-[#e8eefb]/55">DESCRIPTION · OPTIONAL</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={WORKSPACE_FIELD_LIMITS.descriptionCodePoints} autoComplete="off" disabled={isSaving} className={FIELD_CLASS} />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[10px] tracking-widest text-[#e8eefb]/55">DUE DATE · ENCRYPTED</span>
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} disabled={isSaving} className={FIELD_CLASS} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] tracking-widest text-[#e8eefb]/55">SORT ORDER</span>
            <input type="number" min={0} max={WORKSPACE_FIELD_LIMITS.maximumSortOrder} value={sortOrder} onChange={(event) => setSortOrder(event.target.valueAsNumber)} required disabled={isSaving} className={FIELD_CLASS} />
          </label>
        </div>
        {(validationError || requestError) && <p role="alert" className="text-xs text-rose-300">{validationError ?? requestError}</p>}
        <div className="flex flex-col-reverse gap-2 border-t border-[#6ea8ff]/15 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#6ea8ff]/20 px-4 py-2 text-xs tracking-wider text-[#e8eefb]/65 hover:bg-[#6ea8ff]/5 hover:text-[#e8eefb] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <X className="h-3.5 w-3.5" /> CANCEL
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#6ea8ff]/50 bg-[#6ea8ff]/15 px-4 py-2 text-xs font-semibold tracking-wider text-[#e8eefb] hover:bg-[#6ea8ff]/25 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isSaving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {task ? "SAVE ENCRYPTED UPDATE" : "CREATE ENCRYPTED TASK"}
          </button>
        </div>
    </form>
  );
}
