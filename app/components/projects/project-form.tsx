"use client";

import React, { useState } from "react";
import { LoaderCircle, Save, X } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { prepareProjectInput } from "@/app/lib/vault-crypto/project";
import { WORKSPACE_FIELD_LIMITS } from "@/app/lib/workspace.types";
import type { ProjectFormProps } from "./project-form.types";

const FIELD_CLASS = "w-full rounded border border-[#6ea8ff]/25 bg-[#05070d]/80 px-3 py-2 font-mono text-sm text-[#e8eefb] outline-none placeholder:text-[#e8eefb]/25 focus:border-[#6ea8ff]/70 disabled:opacity-60";

export function ProjectForm({ project, isSaving, requestError, onCancel, onSubmit }: ProjectFormProps) {
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    try {
      await onSubmit(prepareProjectInput({ name, description }));
    } catch (error) {
      if (error instanceof Error && error.name === "VaultCryptoValidationError") {
        setValidationError("Check the project fields and size limits, then try again.");
        return;
      }
      throw error;
    }
  };

  return (
    <ConsolePanel
      title={project ? "EDIT PROJECT" : "NEW PROJECT"}
      status="ENCRYPTS IN THIS TAB"
      action={(
        <button type="button" onClick={onCancel} disabled={isSaving} className="inline-flex items-center gap-1 rounded border border-[#6ea8ff]/20 px-2 py-1 text-[10px] tracking-widest text-[#e8eefb]/65 hover:text-[#e8eefb] disabled:opacity-50">
          <X className="h-3 w-3" /> CANCEL
        </button>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs leading-relaxed text-[#e8eefb]/55">
          The name and description are encrypted locally as one project payload.
        </p>
        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-[#e8eefb]/55">PROJECT NAME</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={WORKSPACE_FIELD_LIMITS.titleCodePoints} autoComplete="off" required disabled={isSaving} className={FIELD_CLASS} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-[#e8eefb]/55">DESCRIPTION</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={WORKSPACE_FIELD_LIMITS.descriptionCodePoints} autoComplete="off" disabled={isSaving} className={FIELD_CLASS} />
        </label>
        {(validationError || requestError) && <p role="alert" className="text-xs text-rose-300">{validationError ?? requestError}</p>}
        <button type="submit" disabled={isSaving} className="inline-flex min-h-10 items-center gap-2 rounded border border-[#6ea8ff]/50 bg-[#6ea8ff]/15 px-4 py-2 text-xs font-semibold tracking-wider text-[#e8eefb] hover:bg-[#6ea8ff]/25 disabled:opacity-50">
          {isSaving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {project ? "SAVE ENCRYPTED UPDATE" : "CREATE ENCRYPTED PROJECT"}
        </button>
      </form>
    </ConsolePanel>
  );
}
