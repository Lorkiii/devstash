"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, FileText, LoaderCircle, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { NoteForm } from "@/app/components/notes/note-form";
import { Modal } from "@/app/components/ui/modal";
import { formatDate } from "@/app/lib/format";
import type { Project } from "@/app/lib/vault-data.types";
import { useUnlockedVault, useVaultSession } from "@/app/lib/vault-session";
import {
  WorkspaceFileImportError,
  clearNoteImportDraft,
  readMarkdownImportFile,
  type NoteImportDraft,
} from "@/app/lib/workspace-file-import";
import type { NoteInput } from "@/app/lib/workspace.types";
import {
  PROJECT_WORKSPACE_ICON_ACTION,
  PROJECT_WORKSPACE_PRIMARY_ACTION,
  ProjectWorkspaceShell,
  WorkspaceEmptyState,
  type ProjectWorkspaceTab,
} from "./project-workspace-shell";

function noteExcerpt(body: string) {
  const compact = body.trim().replace(/\s+/g, " ");
  if (!compact) return "Empty note.";
  return compact.length > 110 ? `${compact.slice(0, 110)}…` : compact;
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importActionRef = useRef<HTMLButtonElement>(null);
  const importDraftRef = useRef<NoteImportDraft | null>(null);
  const mountedRef = useRef(true);
  const [query, setQuery] = useState("");
  const [formId, setFormId] = useState<"new" | string | null>(null);
  const [importDraft, setImportDraft] = useState<NoteImportDraft | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const replaceImportDraft = (nextDraft: NoteImportDraft | null) => {
    clearNoteImportDraft(importDraftRef.current);
    importDraftRef.current = nextDraft;
    setImportDraft(nextDraft);
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearNoteImportDraft(importDraftRef.current);
      importDraftRef.current = null;
    };
  }, []);

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
      replaceImportDraft(null);
      onSelectionChange(saved.id, formId !== "new");
    } catch {
      setActionError("The encrypted note could not be saved. No plaintext was sent.");
    } finally {
      setIsSaving(false);
    }
  };

  const closeForm = () => {
    setFormId(null);
    replaceImportDraft(null);
    setActionError(null);
    setImportError(null);
  };

  const handleImportSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.item(0) ?? null;
    event.currentTarget.value = "";
    if (!file) return;

    setIsImporting(true);
    setImportError(null);
    try {
      const draft = await readMarkdownImportFile(file);
      if (!mountedRef.current) {
        clearNoteImportDraft(draft);
        return;
      }
      replaceImportDraft(draft);
      setActionError(null);
      setFormId("new");
    } catch (error) {
      if (!mountedRef.current) return;
      setImportError(
        error instanceof WorkspaceFileImportError
          ? error.message
          : "The selected Markdown file could not be imported.",
      );
    } finally {
      if (mountedRef.current) setIsImporting(false);
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
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,text/markdown"
        tabIndex={-1}
        aria-hidden="true"
        disabled={isImporting}
        onChange={(event) => void handleImportSelection(event)}
        className="hidden"
      />
      <button
        ref={importActionRef}
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        aria-busy={isImporting}
        className={`${PROJECT_WORKSPACE_PRIMARY_ACTION} disabled:cursor-wait disabled:opacity-60`}
      >
        {isImporting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {isImporting ? "READING .MD" : "IMPORT .MD"}
      </button>
      <button
        type="button"
        onClick={() => {
          replaceImportDraft(null);
          setImportError(null);
          setActionError(null);
          setFormId("new");
        }}
        disabled={isImporting}
        className={`${PROJECT_WORKSPACE_PRIMARY_ACTION} disabled:cursor-wait disabled:opacity-60`}
      >
        <Plus className="h-3.5 w-3.5" /> NEW NOTE
      </button>
    </>
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
        onClose={closeForm}
        title={formId === "new" && importDraft ? "REVIEW IMPORTED MARKDOWN" : formId === "new" ? "NEW NOTE" : "EDIT NOTE"}
        status={importDraft ? "LOCAL DRAFT" : "ENCRYPTS IN THIS TAB"}
        description={importDraft
          ? "Review or edit this Markdown source. Nothing is encrypted or saved until you choose Create encrypted note."
          : "This note stays linked to the current project and is encrypted locally before saving."}
        icon={<FileText className="h-4 w-4" />}
        maxWidth="2xl"
        closeDisabled={isSaving}
        fallbackFocusRef={importActionRef}
      >
        {formId && (
          <NoteForm
            key={`${formId}:${importDraft ? "import" : "manual"}`}
            note={formNote}
            initialDraft={formId === "new" ? importDraft ?? undefined : undefined}
            projects={data.projects}
            fixedProject={project}
            isSaving={isSaving}
            requestError={actionError}
            onCancel={closeForm}
            onSubmit={handleSave}
          />
        )}
      </Modal>

      {importError && (
        <p role="alert" className="border-t border-rose-400/15 bg-rose-400/[0.04] px-3 py-2 font-sans text-[11px] text-rose-700 dark:text-rose-300 sm:px-5 sm:text-xs">
          {importError}
        </p>
      )}

      {notes.length === 0 ? (
        <WorkspaceEmptyState
          message="no notes for this project."
          hint="Create a private note here to keep its title, body, and tags attached to this project."
        />
      ) : (
        <div className="grid min-w-0 lg:grid-cols-[minmax(16rem,0.78fr)_minmax(0,1.22fr)]">
          <div className={`${selected ? "hidden lg:block" : ""} min-w-0 border-amber-400/15 lg:border-r`}>
            <label className="flex min-h-10 items-center gap-2 border-b border-amber-400/10 bg-amber-400/[0.02] px-2.5 py-1.5 sm:min-h-12 sm:px-4 sm:py-2.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-amber-700/80 dark:text-amber-300/70" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="search title, body, or #tag"
                aria-label="Search project notes"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent text-[11px] text-foreground placeholder:text-subtle-foreground focus:outline-none sm:text-xs"
              />
              <span className="text-[8px] tracking-wider text-foreground/32 sm:text-[9px]">{visible.length} SHOWN</span>
            </label>

            {visible.length === 0 ? (
              <WorkspaceEmptyState message="no notes match this search." className="py-9" />
            ) : (
              <ul className="divide-y divide-amber-400/12">
                {visible.map((note) => {
                  const active = note.id === selectedNoteId;
                  return (
                    <li key={note.id}>
                      <button
                        type="button"
                        onClick={() => onSelectionChange(note.id)}
                        aria-current={active ? "true" : undefined}
                        className={`min-h-16 w-full px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/50 sm:px-4 sm:py-3 ${
                          active ? "bg-amber-400/[0.06]" : "hover:bg-amber-400/[0.04]"
                        }`}
                      >
                        <span className="block truncate text-[12px] font-semibold text-foreground sm:text-[13px]">{note.title}</span>
                        <span className="mt-1 line-clamp-2 font-sans text-[11px] leading-4 text-muted-foreground">{noteExcerpt(note.body)}</span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1 text-[9px] text-subtle-foreground sm:gap-1.5">
                          <span className="font-mono tracking-wider">{formatDate(note.updatedAt)}</span>
                          {note.tags.map((tag) => (
                            <span key={tag} className="rounded-full border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 font-mono tracking-wider text-amber-800 dark:text-amber-200">
                              #{tag}
                            </span>
                          ))}
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
              <article className="min-w-0 px-2.5 py-2.5 sm:px-5 sm:py-4">
                <button
                  type="button"
                  onClick={() => onSelectionChange(null)}
                  className="mb-2.5 inline-flex min-h-11 items-center gap-1.5 text-[10px] tracking-wider text-amber-700 hover:text-amber-800 dark:text-amber-300/80 dark:hover:text-amber-200 sm:mb-4 lg:hidden"
                >
                  <ArrowLeft className="h-3 w-3" /> BACK TO NOTES
                </button>
                <header className="flex flex-col gap-2 border-b border-amber-400/15 pb-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:pb-4">
                  <div className="min-w-0">
                    <h3 className="break-words text-[15px] font-bold tracking-tight text-foreground sm:text-xl">{selected.title}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[9px] text-foreground/42 sm:mt-2 sm:gap-2 sm:text-[10px]">
                      <span className="font-mono tracking-wider">updated {formatDate(selected.updatedAt)}</span>
                      {selected.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 font-mono tracking-wider text-amber-800 dark:text-amber-200">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        replaceImportDraft(null);
                        setImportError(null);
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
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-rose-400/20 p-1 text-rose-700/75 transition-colors hover:border-rose-400/45 hover:text-rose-800 dark:text-rose-300/70 dark:hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </header>

                <div className="mt-3 rounded-xl border border-amber-400/10 bg-amber-400/[0.02] px-3 py-3 sm:mt-5 sm:px-5 sm:py-5">
                  <div className="whitespace-pre-wrap break-words font-sans text-[13px] leading-6 text-foreground/90 sm:text-[15px] sm:leading-7">
                    {selected.body || <span className="text-subtle-foreground">This note has no body.</span>}
                  </div>
                </div>
                <p className="mt-4 text-[9px] text-foreground/32 sm:mt-6 sm:text-[10px]">
                  Plain-text preview. Sanitized Markdown rendering remains a separate reviewed step.
                </p>
                {actionError && <p role="alert" className="mt-3 text-[11px] text-rose-700 dark:text-rose-300 sm:mt-4 sm:text-xs">{actionError}</p>}
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
