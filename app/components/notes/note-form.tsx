"use client";

import React, { useState } from "react";
import { LoaderCircle, Save, X } from "lucide-react";
import { prepareNoteInput } from "@/app/lib/vault-crypto/note";
import { WORKSPACE_FIELD_LIMITS } from "@/app/lib/workspace.types";
import type { NoteFormProps } from "./note-form.types";

const FIELD_CLASS = "min-h-11 w-full rounded-lg border border-accent/25 bg-background/80 px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-subtle-foreground focus:border-accent/70 focus:ring-2 focus:ring-accent/10 disabled:opacity-60";

export function NoteForm({ note, projects, fixedProject, isSaving, requestError, onCancel, onSubmit }: NoteFormProps) {
  const [projectId, setProjectId] = useState(fixedProject?.id ?? note?.projectId ?? "");
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [tags, setTags] = useState(note?.tags.join(", ") ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    try {
      await onSubmit(prepareNoteInput({ projectId: (fixedProject?.id ?? projectId) || null, title, body, tags }));
    } catch (error) {
      if (error instanceof Error && error.name === "VaultCryptoValidationError") {
        setValidationError("Check the note fields and size limits, then try again.");
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
          <span className="mb-1.5 block text-[10px] tracking-widest text-muted-foreground">TITLE</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={WORKSPACE_FIELD_LIMITS.titleCodePoints} autoComplete="off" autoFocus required disabled={isSaving} className={FIELD_CLASS} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-muted-foreground">BODY</span>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={12} maxLength={WORKSPACE_FIELD_LIMITS.noteBodyCodePoints} autoComplete="off" spellCheck={false} disabled={isSaving} className={FIELD_CLASS} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-muted-foreground">TAGS · OPTIONAL</span>
          <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="process, private" autoComplete="off" spellCheck={false} disabled={isSaving} className={FIELD_CLASS} />
          <span className="mt-1 block text-[10px] text-subtle-foreground">Comma-separated; up to {WORKSPACE_FIELD_LIMITS.tagCount} tags.</span>
        </label>
        {(validationError || requestError) && <p role="alert" className="text-xs text-rose-300">{validationError ?? requestError}</p>}
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
            {note ? "SAVE ENCRYPTED UPDATE" : "CREATE ENCRYPTED NOTE"}
          </button>
        </div>
    </form>
  );
}
