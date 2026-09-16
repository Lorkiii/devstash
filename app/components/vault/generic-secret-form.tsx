"use client";

import React, { useEffect, useState } from "react";
import { Eye, EyeOff, LoaderCircle, Save, X } from "lucide-react";
import { prepareGenericSecretInput } from "@/app/lib/vault-crypto/generic-secret";
import { GENERIC_SECRET_LIMITS } from "@/app/lib/vault-item.types";
import type { GenericSecretFormProps } from "./generic-secret-form.types";

const FIELD_CLASS = "min-h-11 w-full rounded-lg border border-accent/25 bg-background/80 px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-subtle-foreground focus:border-accent/70 focus:ring-2 focus:ring-accent/10 disabled:opacity-60";

export function GenericSecretForm({
  item,
  projects,
  fixedProject,
  isSaving,
  requestError,
  onCancel,
  onSubmit,
}: GenericSecretFormProps) {
  const [projectId, setProjectId] = useState(fixedProject?.id ?? item?.projectId ?? "");
  const [title, setTitle] = useState(item?.title ?? "");
  const [value, setValue] = useState(item?.fields[0]?.value ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [tags, setTags] = useState(item?.tags.join(", ") ?? "");
  const [showValue, setShowValue] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!showValue) return;
    const timer = window.setTimeout(() => setShowValue(false), 10_000);
    return () => window.clearTimeout(timer);
  }, [showValue]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    setShowValue(false);
    try {
      await onSubmit(prepareGenericSecretInput({
        projectId: (fixedProject?.id ?? projectId) || null,
        title,
        value,
        notes,
        tags,
      }));
    } catch (error) {
      if (error instanceof Error && error.name === "VaultCryptoValidationError") {
        setValidationError("Check the required fields and size limits, then try again.");
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
            <div className="min-h-11 rounded-lg border border-accent/18 bg-background/45 px-3 py-2 text-sm text-foreground/72">
              {fixedProject.name}
            </div>
            <span className="mt-1 block text-[10px] text-subtle-foreground">Fixed while managing this project workspace.</span>
          </div>
        ) : (
          <label className="block">
            <span className="mb-1.5 block text-[10px] tracking-widest text-muted-foreground">
              PROJECT · OPTIONAL
            </span>
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              disabled={isSaving}
              className={FIELD_CLASS}
            >
              <option value="">Unassigned</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-muted-foreground">TITLE</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={GENERIC_SECRET_LIMITS.titleCodePoints}
            autoComplete="off"
            autoFocus
            required
            disabled={isSaving}
            className={FIELD_CLASS}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-muted-foreground">SECRET VALUE</span>
          <span className="flex rounded-lg border border-accent/25 bg-background/80 focus-within:border-accent/70 focus-within:ring-2 focus-within:ring-accent/10">
            <input
              type={showValue ? "text" : "password"}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              maxLength={GENERIC_SECRET_LIMITS.valueCodePoints}
              autoComplete="off"
              spellCheck={false}
              required
              disabled={isSaving}
              className="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-sm text-foreground outline-none disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowValue((shown) => !shown)}
              disabled={isSaving}
              aria-label={showValue ? "Mask secret value" : "Reveal secret value"}
              className="inline-flex min-h-11 min-w-11 items-center justify-center px-3 text-accent hover:text-accent disabled:opacity-50"
            >
              {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-muted-foreground">NOTES · OPTIONAL</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            maxLength={GENERIC_SECRET_LIMITS.notesCodePoints}
            autoComplete="off"
            spellCheck={false}
            disabled={isSaving}
            className={FIELD_CLASS}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-muted-foreground">TAGS · OPTIONAL</span>
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="infra, personal"
            autoComplete="off"
            spellCheck={false}
            disabled={isSaving}
            className={FIELD_CLASS}
          />
          <span className="mt-1 block text-[10px] text-subtle-foreground">
            Comma-separated; up to {GENERIC_SECRET_LIMITS.tagCount} tags.
          </span>
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
            {item ? "SAVE ENCRYPTED UPDATE" : "CREATE ENCRYPTED SECRET"}
          </button>
        </div>
    </form>
  );
}
