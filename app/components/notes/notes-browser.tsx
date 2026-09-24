"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Modal } from "@/app/components/ui/modal";
import { PageHeading } from "@/app/components/ui/page-heading";
import { ProjectBadge } from "@/app/components/ui/project-badge";
import { RecordInspector } from "@/app/components/ui/record-inspector";
import { useUnlockedVault, useVaultSession } from "@/app/lib/vault-session";
import { formatDate } from "@/app/lib/format";
import type { NoteInput } from "@/app/lib/workspace.types";
import { NoteForm } from "./note-form";

function noteExcerpt(body: string) {
  const compact = body.trim().replace(/\s+/g, " ");
  if (!compact) return "Empty note.";
  return compact.length > 110 ? `${compact.slice(0, 110)}…` : compact;
}

function NoteTagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <>
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-amber-800 dark:text-amber-200"
        >
          #{tag}
        </span>
      ))}
    </>
  );
}

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

  const select = (id: string | null, replace = false) => {
    setFormId(null);
    setActionError(null);
    const href = id ? `/notes?note=${id}` : "/notes";
    if (replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
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
      select(saved.id, true);
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
      select(null, true);
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
      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded border border-accent/40 bg-accent/10 px-2.5 py-1.5 font-mono text-[11px] tracking-wider text-foreground hover:bg-accent/20 sm:px-3 sm:text-xs"
    >
      <Plus className="w-3.5 h-3.5" /> NEW NOTE
    </button>
  );

  return (
    <div className="space-y-3 sm:space-y-4">
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

      <RecordInspector
        selected={selected !== null}
        listLabel="Private notes"
        detailLabel="Note details"
        list={(
          <ConsolePanel title="NOTEBOOK" status={`${visible.length} SHOWN`} tone="notes" surface="flat" className="h-full" bodyClassName="p-0">
            <div className="border-b border-amber-400/15 p-2.5 sm:p-3">
              <label className="flex min-h-11 items-center gap-2 rounded-lg border border-amber-400/15 bg-amber-400/[0.03] px-2.5">
                <Search className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="search title, body, #tag"
                  aria-label="Search notes"
                  autoComplete="off"
                  spellCheck={false}
                  className="min-w-0 flex-1 bg-transparent text-[11px] text-foreground placeholder:text-subtle-foreground focus:outline-none sm:text-xs"
                />
              </label>
            </div>
            {visible.length === 0 ? (
              <div className="p-2.5 sm:p-3">
                <EmptyState
                  message={data.notes.length === 0 ? "No private notes yet." : "No notes match this search."}
                  hint={data.notes.length === 0 ? "Create a note to keep private context here." : "Try another title, phrase, or tag."}
                />
              </div>
            ) : (
              <ul className="divide-y divide-amber-400/12">
                {visible.map((note) => {
                  const active = note.id === selectedId;
                  const assignedProject = projectName(note.projectId);
                  return (
                    <li key={note.id}>
                      <button
                        type="button"
                        onClick={() => select(note.id)}
                        aria-current={active ? "true" : undefined}
                        className={`min-h-16 w-full px-3 py-2.5 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/50 sm:px-4 sm:py-3 ${
                          active ? "bg-amber-400/[0.06]" : "hover:bg-amber-400/[0.04]"
                        }`}
                      >
                        <span className="block truncate text-[12px] font-semibold text-foreground sm:text-[13px]">{note.title}</span>
                        <span className="mt-1 line-clamp-2 font-sans text-[11px] leading-4 text-muted-foreground">{noteExcerpt(note.body)}</span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1 text-[9px] text-subtle-foreground sm:gap-1.5">
                          <span className="font-mono tracking-wider">{formatDate(note.updatedAt)}</span>
                          {assignedProject && <ProjectBadge name={assignedProject} />}
                          <NoteTagList tags={note.tags} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ConsolePanel>
        )}
        detail={selected ? (
          <ConsolePanel
              title="NOTE DETAIL"
              status={`updated ${formatDate(selected.updatedAt)}`}
              tone="notes"
              surface="flat"
              className="h-full"
              action={(
                <div className="flex flex-wrap items-center gap-1">
                  <button type="button" onClick={() => setFormId(selected.id)} disabled={isDeleting} className="inline-flex min-h-11 items-center gap-1 rounded border border-amber-400/25 px-2.5 py-1 text-[10px] tracking-wider text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 disabled:opacity-50">
                    <Pencil className="h-3 w-3" /> EDIT
                  </button>
                  <button type="button" onClick={() => void handleDelete()} disabled={isDeleting} className="inline-flex min-h-11 items-center gap-1 rounded border border-rose-400/20 px-2.5 py-1 text-[10px] tracking-wider text-rose-700 dark:text-rose-300/75 hover:text-rose-800 dark:hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50 disabled:opacity-50">
                    <Trash2 className="h-3 w-3" /> {isDeleting ? "DELETING…" : "DELETE"}
                  </button>
                </div>
              )}
            >
              <button
                type="button"
                onClick={() => select(null, true)}
                className="lg:hidden mb-2.5 inline-flex min-h-11 items-center gap-1.5 text-[10px] tracking-wider text-amber-800 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200 cursor-pointer sm:mb-3"
              >
                <ArrowLeft className="w-3 h-3" /> BACK TO LIST
              </button>
              <div className="rounded-xl border border-amber-400/10 bg-amber-400/[0.02] px-3 py-3 sm:px-5 sm:py-5">
                <h3 className="break-words text-lg font-bold tracking-tight text-foreground sm:text-2xl">{selected.title}</h3>
                <div className="mt-2 mb-4 flex flex-wrap items-center gap-1.5 text-[9px] text-subtle-foreground sm:mb-5 sm:gap-2 sm:text-[10px]">
                  {selectedProjectName && <ProjectBadge name={selectedProjectName} />}
                  <NoteTagList tags={selected.tags} />
                </div>
                <article className="whitespace-pre-wrap break-words font-sans text-[13px] leading-6 text-foreground/90 sm:text-[15px] sm:leading-7">
                  {selected.body}
                </article>
              </div>
              <p className="mt-4 font-mono text-[9px] text-subtle-foreground sm:mt-6 sm:text-[10px]">
                Plain-text preview. Sanitized Markdown rendering is a later, reviewed step.
              </p>
              {actionError && <p role="alert" className="mt-3 text-[11px] text-rose-700 dark:text-rose-300 sm:mt-4 sm:text-xs">{actionError}</p>}
          </ConsolePanel>
        ) : (
          <ConsolePanel title="NOTE DETAIL" tone="notes" surface="flat" className="h-full">
            <EmptyState message="Select a note to read it." />
          </ConsolePanel>
        )}
      />
    </div>
  );
}
