"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { NoteForm } from "@/app/components/notes/note-form";
import { Modal } from "@/app/components/ui/modal";
import { formatDate } from "@/app/lib/format";
import type { Project } from "@/app/lib/vault-data.types";
import { useUnlockedVault, useVaultSession } from "@/app/lib/vault-session";
import type { NoteInput } from "@/app/lib/workspace.types";
import {
  PROJECT_WORKSPACE_ICON_ACTION,
  PROJECT_WORKSPACE_PRIMARY_ACTION,
  ProjectWorkspaceShell,
  WorkspaceEmptyState,
  type ProjectWorkspaceTab,
} from "./project-workspace-shell";

interface ProjectNotesWorkspaceProps {
  project: Project;
  counts: Record<ProjectWorkspaceTab, number>;
  selectedNoteId: string | null;
  onTabChange: (tab: ProjectWorkspaceTab) => void;
  onSelectionChange: (id: string | null, replace?: boolean) => void;
}

export function ProjectNotesWorkspace({
  project,
  counts,
  selectedNoteId,
  onTabChange,
  onSelectionChange,
}: ProjectNotesWorkspaceProps) {
  const data = useUnlockedVault();
  const { createNote, deleteNote, touchRecent, updateNote } = useVaultSession();
  const [query, setQuery] = useState("");
  const [formId, setFormId] = useState<"new" | string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const notes = useMemo(
    () => data.notes
      .filter((note) => note.projectId === project.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [data.notes, project.id],
  );
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return notes.filter((note) =>
      !needle ||
      note.title.toLowerCase().includes(needle) ||
      note.body.toLowerCase().includes(needle) ||
      note.tags.some((tag) => tag.toLowerCase().includes(needle)),
    );
  }, [notes, query]);
  const selected = notes.find((note) => note.id === selectedNoteId) ?? null;
  const formNote = formId && formId !== "new"
    ? notes.find((note) => note.id === formId)
    : undefined;

  useEffect(() => {
    if (selectedNoteId && !selected) onSelectionChange(null, true);
  }, [selectedNoteId, selected, onSelectionChange]);

  useEffect(() => {
    if (selected) touchRecent("note", selected.id);
  }, [selected, touchRecent]);

  const handleSave = async (input: NoteInput) => {
    setIsSaving(true);
    setActionError(null);
    try {
      const saved = formId === "new"
        ? await createNote(input)
        : formId
          ? await updateNote(formId, input)
          : null;
      if (!saved) return;
      setFormId(null);
      onSelectionChange(saved.id, formId !== "new");
    } catch {
      setActionError("The encrypted note could not be saved. No plaintext was sent.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected || !window.confirm("Permanently delete this encrypted note? This cannot be undone.")) return;

    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteNote(selected.id);
      onSelectionChange(null, true);
    } catch {
      setActionError("The encrypted note could not be deleted.");
    } finally {
      setIsDeleting(false);
    }
  };

  const action = (
    <button
      type="button"
      onClick={() => {
        setActionError(null);
        setFormId("new");
      }}
      className={PROJECT_WORKSPACE_PRIMARY_ACTION}
    >
      <Plus className="h-3.5 w-3.5" /> NEW NOTE
    </button>
  );

  return (
    <ProjectWorkspaceShell
      activeTab="notes"
      counts={counts}
      status={`${notes.length} ${notes.length === 1 ? "NOTE" : "NOTES"}`}
      action={action}
      onTabChange={onTabChange}
    >
      <Modal
        isOpen={formId !== null}
        onClose={() => {
          setFormId(null);
          setActionError(null);
        }}
        title={formId === "new" ? "NEW NOTE" : "EDIT NOTE"}
        status="ENCRYPTS IN THIS TAB"
        description="This note stays linked to the current project and is encrypted locally before saving."
        icon={<FileText className="h-4 w-4" />}
        maxWidth="2xl"
        closeDisabled={isSaving}
      >
        {formId && (
          <NoteForm
            key={formId}
            note={formNote}
            projects={data.projects}
            fixedProject={project}
            isSaving={isSaving}
            requestError={actionError}
            onCancel={() => {
              setFormId(null);
              setActionError(null);
            }}
            onSubmit={handleSave}
          />
        )}
      </Modal>

      {notes.length === 0 ? (
        <WorkspaceEmptyState
          message="no notes for this project."
          hint="Create a private note here to keep its title, body, and tags attached to this project."
        />
      ) : (
        <div className="grid min-w-0 lg:grid-cols-[minmax(16rem,0.78fr)_minmax(0,1.22fr)]">
          <div className={`${selected ? "hidden lg:block" : ""} min-w-0 border-accent/12 lg:border-r`}>
            <label className="flex min-h-12 items-center gap-2 border-b border-accent/10 px-4 py-2.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-amber-700/80 dark:text-amber-300/70" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="search title, body, or #tag"
                aria-label="Search project notes"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent text-xs text-foreground placeholder:text-subtle-foreground focus:outline-none"
              />
              <span className="text-[9px] tracking-wider text-foreground/32">{visible.length} SHOWN</span>
            </label>

            {visible.length === 0 ? (
              <WorkspaceEmptyState message="no notes match this search." className="py-9" />
            ) : (
              <ul className="divide-y divide-accent/10">
                {visible.map((note) => {
                  const active = note.id === selectedNoteId;
                  return (
                    <li key={note.id}>
                      <button
                        type="button"
                        onClick={() => onSelectionChange(note.id)}
                        aria-current={active ? "true" : undefined}
                        className={`min-h-16 w-full px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/50 ${
                          active ? "bg-amber-400/10" : "hover:bg-amber-400/5"
                        }`}
                      >
                        <span className="block truncate text-xs text-foreground">{note.title}</span>
                        <span className="mt-1 block truncate text-[10px] text-subtle-foreground">
                          {formatDate(note.updatedAt)}
                          {note.tags.length > 0 && ` · ${note.tags.map((tag) => `#${tag}`).join(" ")}`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className={`${selected ? "" : "hidden lg:block"} min-w-0`}>
            {selected ? (
              <article className="min-w-0 px-4 py-4 sm:px-5">
                <button
                  type="button"
                  onClick={() => onSelectionChange(null)}
                  className="mb-4 inline-flex min-h-10 items-center gap-1.5 text-[10px] tracking-widest text-amber-700 hover:text-amber-800 dark:text-amber-300/80 dark:hover:text-amber-200 lg:hidden"
                >
                  <ArrowLeft className="h-3 w-3" /> BACK TO NOTES
                </button>
                <header className="flex flex-col gap-3 border-b border-accent/12 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-bold text-foreground">{selected.title}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-foreground/42">
                      <span>updated {formatDate(selected.updatedAt)}</span>
                      {selected.tags.map((tag) => <span key={tag}>#{tag}</span>)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActionError(null);
                        setFormId(selected.id);
                      }}
                      disabled={isDeleting}
                      aria-label="Edit note"
                      className={PROJECT_WORKSPACE_ICON_ACTION}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      disabled={isDeleting}
                      aria-label="Delete note"
                      className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-rose-400/20 p-1 text-rose-700/75 transition-colors hover:border-rose-400/45 hover:text-rose-800 dark:text-rose-300/70 dark:hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </header>

                <div className="mt-5 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground/82">
                  {selected.body || <span className="text-subtle-foreground">This note has no body.</span>}
                </div>
                <p className="mt-6 text-[10px] text-foreground/32">
                  Plain-text preview. Sanitized Markdown rendering remains a separate reviewed step.
                </p>
                {actionError && <p role="alert" className="mt-4 text-xs text-rose-700 dark:text-rose-300">{actionError}</p>}
              </article>
            ) : (
              <WorkspaceEmptyState message="select a note to read it." />
            )}
          </div>
        </div>
      )}
    </ProjectWorkspaceShell>
  );
}
