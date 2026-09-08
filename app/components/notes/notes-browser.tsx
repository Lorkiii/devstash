"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { EmptyState } from "@/app/components/ui/empty-state";
import { PageHeading } from "@/app/components/ui/page-heading";
import { useUnlockedVault, useVaultSession } from "@/app/lib/vault-session";
import { formatDate } from "@/app/lib/format";

// Note bodies are rendered as plain text for now. Markdown rendering waits
// for a reviewed sanitizer; arbitrary HTML is never rendered.
export function NotesBrowser() {
  const data = useUnlockedVault();
  const { touchRecent } = useVaultSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedId = searchParams.get("note");
  const [query, setQuery] = useState<string>("");

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
  const projectName = (projectId?: string) =>
    data.projects.find((project) => project.id === projectId)?.name;

  useEffect(() => {
    if (selected) touchRecent("note", selected.id);
  }, [selected, touchRecent]);

  const select = (id: string | null) => {
    router.replace(id ? `/notes?note=${id}` : "/notes");
  };

  const newButton = (
    <button
      type="button"
      disabled
      title="Creation arrives with the ciphertext API phase"
      className="inline-flex items-center gap-1.5 rounded border border-[#6ea8ff]/30 bg-[#0a1220]/70 px-3 py-1.5 font-mono text-xs tracking-wider text-[#e8eefb]/60 disabled:cursor-not-allowed"
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className={`lg:col-span-4 ${selected ? "hidden lg:block" : ""}`}>
          <ConsolePanel title="NOTES" status={`${visible.length} SHOWN`} className="h-full" bodyClassName="p-0">
            <div className="p-3 border-b border-[#6ea8ff]/10">
              <label className="flex items-center gap-2 rounded border border-[#6ea8ff]/20 bg-[#070d18]/80 px-2.5 py-1.5">
                <Search className="w-3.5 h-3.5 text-[#6ea8ff]/70" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="search title, body, #tag"
                  aria-label="Search notes"
                  autoComplete="off"
                  spellCheck={false}
                  className="flex-1 bg-transparent text-xs text-[#e8eefb] placeholder:text-[#e8eefb]/30 focus:outline-none"
                />
              </label>
            </div>
            {visible.length === 0 ? (
              <div className="p-3">
                <EmptyState message="no notes match." />
              </div>
            ) : (
              <ul className="divide-y divide-[#6ea8ff]/10">
                {visible.map((note) => {
                  const active = note.id === selectedId;
                  return (
                    <li key={note.id}>
                      <button
                        type="button"
                        onClick={() => select(note.id)}
                        aria-current={active ? "true" : undefined}
                        className={`w-full px-3 py-2.5 text-left transition-colors cursor-pointer ${
                          active ? "bg-[#6ea8ff]/10" : "hover:bg-[#6ea8ff]/5"
                        }`}
                      >
                        <span className="block text-xs text-[#e8eefb] truncate">{note.title}</span>
                        <span className="block text-[10px] text-[#e8eefb]/45 truncate mt-0.5">
                          {formatDate(note.updatedAt)}
                          {projectName(note.projectId) && ` · ${projectName(note.projectId)}`}
                          {note.tags.length > 0 && ` · ${note.tags.map((tag) => `#${tag}`).join(" ")}`}
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
            <ConsolePanel title="NOTE" status={`updated ${formatDate(selected.updatedAt)}`} className="h-full">
              <button
                type="button"
                onClick={() => select(null)}
                className="lg:hidden mb-3 inline-flex items-center gap-1.5 text-[10px] tracking-widest text-[#6ea8ff]/80 hover:text-[#6ea8ff] cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" /> BACK TO LIST
              </button>
              <h3 className="text-base font-bold text-[#e8eefb]">{selected.title}</h3>
              <div className="mt-1 mb-4 flex flex-wrap items-center gap-2 text-[10px] text-[#e8eefb]/45">
                {projectName(selected.projectId) && (
                  <span className="px-1.5 py-0.5 rounded border border-[#e8eefb]/15 tracking-widest">
                    {projectName(selected.projectId)}
                  </span>
                )}
                {selected.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
              <article className="text-sm leading-relaxed text-[#e8eefb]/85 whitespace-pre-wrap font-sans">
                {selected.body}
              </article>
              <p className="mt-6 text-[10px] text-[#e8eefb]/35 font-mono">
                Plain-text preview. Sanitized Markdown rendering is a later, reviewed step.
              </p>
            </ConsolePanel>
          ) : (
            <ConsolePanel title="NOTE" tone="muted" className="h-full">
              <EmptyState message="select a note to read it." />
            </ConsolePanel>
          )}
        </div>
      </div>
    </div>
  );
}
