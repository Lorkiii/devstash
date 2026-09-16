"use client";

import React, { useState } from "react";
import { LoaderCircle, Save, X } from "lucide-react";
import { prepareProjectInput } from "@/app/lib/vault-crypto/project";
import { WORKSPACE_FIELD_LIMITS } from "@/app/lib/workspace.types";
import type { ProjectFormProps } from "./project-form.types";

const FIELD_CLASS = "min-h-11 w-full rounded-lg border border-accent/25 bg-background/80 px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-subtle-foreground focus:border-accent/70 focus:ring-2 focus:ring-accent/10 disabled:opacity-60";

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
    <form onSubmit={handleSubmit} aria-busy={isSaving} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-[10px] tracking-widest text-muted-foreground">
          PROJECT NAME
        </span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={WORKSPACE_FIELD_LIMITS.titleCodePoints}
          autoComplete="off"
          autoFocus
          required
          disabled={isSaving}
          className={FIELD_CLASS}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[10px] tracking-widest text-muted-foreground">
          DESCRIPTION
        </span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          maxLength={WORKSPACE_FIELD_LIMITS.descriptionCodePoints}
          autoComplete="off"
          disabled={isSaving}
          className={FIELD_CLASS}
        />
      </label>
      {(validationError || requestError) && (
        <p role="alert" className="text-xs text-rose-300">
          {validationError ?? requestError}
        </p>
      )}
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
          {project ? "SAVE ENCRYPTED UPDATE" : "CREATE ENCRYPTED PROJECT"}
        </button>
      </div>
    </form>
  );
}
