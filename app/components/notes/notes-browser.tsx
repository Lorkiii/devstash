"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Modal } from "@/app/components/ui/modal";
import { PageHeading } from "@/app/components/ui/page-heading";
import { ProjectBadge } from "@/app/components/ui/project-badge";
import { useUnlockedVault, useVaultSession } from "@/app/lib/vault-session";
import { formatDate } from "@/app/lib/format";
import type { NoteInput } from "@/app/lib/workspace.types";
import { NoteForm } from "./note-form";

// Note bodies are rendered as plain text for now. Markdown rendering waits
// for a reviewed sanitizer; arbitrary HTML is never rendered.
export function NotesBrowser() {
  const data = useUnlockedVault();
  const { createNote, deleteNote, touchRecent, updateNote } = useVaultSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedId = searchParams.get("note");
  const createRequested = searchParams.get("create") === "1";
  const [query, setQuery] = useState<string>("");
  const [formId, setFormId] = useState<"new" | string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.notes
      .filter(
        (note) =>
          !needle ||
          note.title.toLowerCase().includes(needle) ||
          note.body.toLowerCase().includes(needle) ||
          note.tags.some((tag) => tag.toLowerCase().includes(needle))
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [data.notes, query]);

  const selected = data.notes.find((note) => note.id === selectedId) ?? null;
  const activeFormId = formId ?? (createRequested ? "new" : null);
  const formNote = activeFormId && activeFormId !== "new"
    ? data.notes.find((note) => note.id === activeFormId)
    : undefined;
  const projectName = (projectId?: string) =>
    data.projects.find((project) => project.id === projectId)?.name;
  const selectedProjectName = selected ? projectName(selected.projectId) : undefined;

  useEffect(() => {
    if (selected) touchRecent("note", selected.id);
  }, [selected, touchRecent]);

  const select = (id: string | null) => {
    setFormId(null);
    setActionError(null);
    router.replace(id ? `/notes?note=${id}` : "/notes");
  };

  const handleSave = async (input: NoteInput) => {
    setIsSaving(true);
    setActionError(null);
    try {
      const saved = activeFormId === "new"
        ? await createNote(input)
        : activeFormId
          ? await updateNote(activeFormId, input)
          : null;
      if (!saved) return;
      select(saved.id);
    } catch {
      setActionError("The encrypted note could not be saved. No plaintext was sent.");
    } finally {
      setIsSaving(false);
    }
  };

  const closeForm = () => {
    setFormId(null);
    setActionError(null);
    if (createRequested) router.replace("/notes");
  };

  const handleDelete = async () => {
    if (!selected || !window.confirm("Permanently delete this encrypted note? This cannot be undone.")) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteNote(selected.id);
      select(null);
    } catch {
      setActionError("The encrypted note could not be deleted.");
    } finally {
      setIsDeleting(false);
    }
  };

  const newButton = (
    <button
      type="button"
      onClick={() => {
        router.replace("/notes");
        setActionError(null);
        setFormId("new");
      }}
      className="inline-flex min-h-10 items-center gap-1.5 rounded border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-xs tracking-wider text-foreground hover:bg-accent/20"
    >
      <Plus className="w-3.5 h-3.5" /> NEW NOTE
    </button>
  );

  return (
    <div className="space-y-4">
      <PageHeading
        eyebrow="NOTES"
        title="Private notes"
        description="Titles, bodies, and tags are encrypted. Search runs over decrypted text in this tab."
        actions={newButton}
      />

      <Modal
        isOpen={activeFormId !== null}
        onClose={closeForm}
        title={activeFormId === "new" ? "NEW NOTE" : "EDIT NOTE"}
        status="ENCRYPTS IN THIS TAB"
        description="The title, body, tags, and optional project link are encrypted locally before saving."
        icon={activeFormId === "new" ? <Plus className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        maxWidth="2xl"
        closeDisabled={isSaving}
      >
        {activeFormId && (
          <NoteForm
            key={activeFormId}
            note={formNote}
            projects={data.projects}
            isSaving={isSaving}
            requestError={actionError}
            onCancel={closeForm}
            onSubmit={handleSave}
          />
        )}
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className={`lg:col-span-4 ${selected ? "hidden lg:block" : ""}`}>
          <ConsolePanel title="NOTES" status={`${visible.length} SHOWN`} surface="flat" className="h-full" bodyClassName="p-0">
            <div className="p-3 border-b border-accent/10">
              <label className="flex items-center gap-2 rounded border border-accent/20 bg-surface-muted/80 px-2.5 py-1.5">
                <Search className="w-3.5 h-3.5 text-accent" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="search title, body, #tag"
                  aria-label="Search notes"
                  autoComplete="off"
                  spellCheck={false}
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-subtle-foreground focus:outline-none"
                />
              </label>
            </div>
            {visible.length === 0 ? (
              <div className="p-3">
                <EmptyState message="no notes match." />
              </div>
            ) : (
              <ul className="divide-y divide-accent/10">
                {visible.map((note) => {
                  const active = note.id === selectedId;
                  const assignedProject = projectName(note.projectId);
                  return (
                    <li key={note.id}>
                      <button
                        type="button"
                        onClick={() => select(note.id)}
                        aria-current={active ? "true" : undefined}
                        className={`w-full px-3 py-2.5 text-left transition-colors cursor-pointer ${
                          active ? "bg-accent/10" : "hover:bg-accent/5"
                        }`}
                      >
                        <span className="block text-xs text-foreground truncate">{note.title}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-subtle-foreground">
                          <span>{formatDate(note.updatedAt)}</span>
                          {assignedProject && <ProjectBadge name={assignedProject} />}
                          {note.tags.length > 0 && <span className="truncate">{note.tags.map((tag) => `#${tag}`).join(" ")}</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ConsolePanel>
        </div>

        <div className={`lg:col-span-8 ${selected ? "" : "hidden lg:block"}`}>
          {selected ? (
            <ConsolePanel
              title="NOTE"
              status={`updated ${formatDate(selected.updatedAt)}`}
              surface="flat"
              className="h-full"
              action={(
                <div className="flex flex-wrap items-center gap-1">
                  <button type="button" onClick={() => setFormId(selected.id)} disabled={isDeleting} className="inline-flex min-h-10 items-center gap-1 rounded border border-accent/20 px-2 py-1 text-[10px] tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-50">
                    <Pencil className="h-3 w-3" /> EDIT
                  </button>
                  <button type="button" onClick={() => void handleDelete()} disabled={isDeleting} className="inline-flex min-h-10 items-center gap-1 rounded border border-rose-400/20 px-2 py-1 text-[10px] tracking-widest text-rose-700 dark:text-rose-300/75 hover:text-rose-800 dark:hover:text-rose-200 disabled:opacity-50">
                    <Trash2 className="h-3 w-3" /> {isDeleting ? "DELETING…" : "DELETE"}
                  </button>
                </div>
              )}
            >
              <button
                type="button"
                onClick={() => select(null)}
                className="lg:hidden mb-3 inline-flex items-center gap-1.5 text-[10px] tracking-widest text-accent hover:text-accent cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" /> BACK TO LIST
              </button>
              <h3 className="text-base font-bold text-foreground">{selected.title}</h3>
              <div className="mt-1 mb-4 flex flex-wrap items-center gap-2 text-[10px] text-subtle-foreground">
                {selectedProjectName && <ProjectBadge name={selectedProjectName} />}
                {selected.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
              <article className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap font-sans">
                {selected.body}
              </article>
              <p className="mt-6 text-[10px] text-subtle-foreground font-mono">
                Plain-text preview. Sanitized Markdown rendering is a later, reviewed step.
              </p>
              {actionError && <p role="alert" className="mt-4 text-xs text-rose-700 dark:text-rose-300">{actionError}</p>}
            </ConsolePanel>
          ) : (
            <ConsolePanel title="NOTE" tone="muted" surface="flat" className="h-full">
              <EmptyState message="select a note to read it." />
            </ConsolePanel>
          )}
        </div>
      </div>
    </div>
  );
}
