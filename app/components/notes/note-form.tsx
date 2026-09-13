"use client";

import React, { useState } from "react";
import { LoaderCircle, Save, X } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { prepareNoteInput } from "@/app/lib/vault-crypto/note";
import { WORKSPACE_FIELD_LIMITS } from "@/app/lib/workspace.types";
import type { NoteFormProps } from "./note-form.types";

const FIELD_CLASS = "w-full rounded border border-[#6ea8ff]/25 bg-[#05070d]/80 px-3 py-2 font-mono text-sm text-[#e8eefb] outline-none placeholder:text-[#e8eefb]/25 focus:border-[#6ea8ff]/70 disabled:opacity-60";

export function NoteForm({ note, projects, isSaving, requestError, onCancel, onSubmit }: NoteFormProps) {
  const [projectId, setProjectId] = useState(note?.projectId ?? "");
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [tags, setTags] = useState(note?.tags.join(", ") ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    try {
      await onSubmit(prepareNoteInput({ projectId: projectId || null, title, body, tags }));
    } catch (error) {
      if (error instanceof Error && error.name === "VaultCryptoValidationError") {
        setValidationError("Check the note fields and size limits, then try again.");
        return;
      }
      throw error;
    }
  };

  return (
    <ConsolePanel
      title={note ? "EDIT NOTE" : "NEW NOTE"}
      status="ENCRYPTS IN THIS TAB"
      action={(
        <button type="button" onClick={onCancel} disabled={isSaving} className="inline-flex items-center gap-1 rounded border border-[#6ea8ff]/20 px-2 py-1 text-[10px] tracking-widest text-[#e8eefb]/65 hover:text-[#e8eefb] disabled:opacity-50">
          <X className="h-3 w-3" /> CANCEL
        </button>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs leading-relaxed text-[#e8eefb]/55">
          Title, body, tags, and project association are authenticated before this note is shown.
        </p>
        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-[#e8eefb]/55">PROJECT · OPTIONAL</span>
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={isSaving} className={FIELD_CLASS}>
            <option value="">Unassigned</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-[#e8eefb]/55">TITLE</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={WORKSPACE_FIELD_LIMITS.titleCodePoints} autoComplete="off" required disabled={isSaving} className={FIELD_CLASS} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-[#e8eefb]/55">BODY</span>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={12} maxLength={WORKSPACE_FIELD_LIMITS.noteBodyCodePoints} autoComplete="off" spellCheck={false} disabled={isSaving} className={FIELD_CLASS} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-[#e8eefb]/55">TAGS · OPTIONAL</span>
          <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="process, private" autoComplete="off" spellCheck={false} disabled={isSaving} className={FIELD_CLASS} />
          <span className="mt-1 block text-[10px] text-[#e8eefb]/35">Comma-separated; up to {WORKSPACE_FIELD_LIMITS.tagCount} tags.</span>
        </label>
        {(validationError || requestError) && <p role="alert" className="text-xs text-rose-300">{validationError ?? requestError}</p>}
        <button type="submit" disabled={isSaving} className="inline-flex min-h-10 items-center gap-2 rounded border border-[#6ea8ff]/50 bg-[#6ea8ff]/15 px-4 py-2 text-xs font-semibold tracking-wider text-[#e8eefb] hover:bg-[#6ea8ff]/25 disabled:opacity-50">
          {isSaving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {note ? "SAVE ENCRYPTED UPDATE" : "CREATE ENCRYPTED NOTE"}
        </button>
      </form>
    </ConsolePanel>
  );
}
