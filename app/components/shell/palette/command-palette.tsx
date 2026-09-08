"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Lock, Search } from "lucide-react";
import type { VaultData } from "@/app/lib/vault-data.types";
import { VAULT_TYPE_META } from "@/app/lib/vault-types";
import { NAV_ITEMS } from "../nav-items";

// The parent mounts this only while open, so local state is fresh per open.
interface CommandPaletteProps {
  onClose: () => void;
  data: VaultData;
  onLock: () => void;
}

interface PaletteEntry {
  id: string;
  group: "Actions" | "Secrets" | "Projects" | "Notes" | "Tasks";
  label: string;
  hint?: string;
  run: () => void;
}

const MAX_RESULTS = 12;

// Local search over decrypted records already in memory plus navigation
// commands. Matching happens entirely in the browser; the query is never sent
// anywhere and secret values are never searched or displayed here.
export function CommandPalette({ onClose, data, onLock }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState<string>("");
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const updateQuery = (next: string) => {
    setQuery(next);
    setActiveIndex(0);
  };

  const entries = useMemo<PaletteEntry[]>(() => {
    const go = (href: string) => () => {
      router.push(href);
      onClose();
    };
    const projectName = (projectId?: string) =>
      data.projects.find((project) => project.id === projectId)?.name;

    const actions: PaletteEntry[] = [
      ...NAV_ITEMS.map((item) => ({
        id: `nav-${item.href}`,
        group: "Actions" as const,
        label: `Go to ${item.label}`,
        run: go(item.href),
      })),
      {
        id: "lock",
        group: "Actions",
        label: "Lock vault",
        hint: "L",
        run: () => {
          onClose();
          onLock();
        },
      },
    ];

    const secrets: PaletteEntry[] = data.secrets.map((item) => ({
      id: `secret-${item.id}`,
      group: "Secrets",
      label: item.title,
      hint: `${VAULT_TYPE_META[item.type].short}${projectName(item.projectId) ? ` · ${projectName(item.projectId)}` : ""}`,
      run: go(`/vault?item=${item.id}`),
    }));

    const projects: PaletteEntry[] = data.projects.map((project) => ({
      id: `project-${project.id}`,
      group: "Projects",
      label: project.name,
      run: go(`/projects/${project.id}`),
    }));

    const notes: PaletteEntry[] = data.notes.map((note) => ({
      id: `note-${note.id}`,
      group: "Notes",
      label: note.title,
      hint: note.tags.join(", "),
      run: go(`/notes?note=${note.id}`),
    }));

    const tasks: PaletteEntry[] = data.tasks
      .filter((task) => !task.done)
      .map((task) => ({
        id: `task-${task.id}`,
        group: "Tasks",
        label: task.title,
        hint: projectName(task.projectId),
        run: go("/tasks"),
      }));

    return [...actions, ...secrets, ...projects, ...notes, ...tasks];
  }, [data, router, onClose, onLock]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries.filter((entry) => entry.group === "Actions").slice(0, MAX_RESULTS);
    return entries
      .filter(
        (entry) =>
          entry.label.toLowerCase().includes(needle) ||
          (entry.hint ? entry.hint.toLowerCase().includes(needle) : false)
      )
      .slice(0, MAX_RESULTS);
  }, [entries, query]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      results[activeIndex]?.run();
    }
  };

  let lastGroup: PaletteEntry["group"] | null = null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="w-full max-w-xl rounded-lg border border-[#6ea8ff]/40 bg-[#0a1220] shadow-[0_0_50px_rgba(110,168,255,0.2)] font-mono text-[#e8eefb] overflow-hidden"
      >
        <div className="flex items-center gap-3 border-b border-[#6ea8ff]/20 px-4 py-3">
          <Search className="w-4 h-4 text-[#6ea8ff]" />
          <input
            autoFocus
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Search records or type a command…"
            aria-label="Search records or commands"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-transparent text-sm text-[#e8eefb] placeholder:text-[#e8eefb]/30 focus:outline-none"
          />
          <kbd className="rounded border border-[#6ea8ff]/25 px-1.5 py-0.5 text-[10px] text-[#e8eefb]/50">ESC</kbd>
        </div>

        <ul role="listbox" aria-label="Results" className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 && (
            <li className="px-4 py-6 text-xs text-[#e8eefb]/50">
              <span className="text-[#6ea8ff]/70 mr-2">&gt;</span>no matches in memory
            </li>
          )}
          {results.map((entry, index) => {
            const showGroup = entry.group !== lastGroup;
            lastGroup = entry.group;
            const active = index === activeIndex;
            return (
              <React.Fragment key={entry.id}>
                {showGroup && (
                  <li aria-hidden="true" className="px-4 pt-2 pb-1 text-[10px] tracking-widest text-[#e8eefb]/40">
                    {entry.group.toUpperCase()}
                  </li>
                )}
                <li
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={entry.run}
                  className={`mx-2 flex items-center justify-between gap-3 rounded px-3 py-2 text-xs cursor-pointer ${
                    active ? "bg-[#6ea8ff]/15 text-[#e8eefb]" : "text-[#e8eefb]/75 hover:bg-[#6ea8ff]/5"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {entry.id === "lock" && <Lock className="w-3.5 h-3.5 text-amber-300" />}
                    <span className="truncate">{entry.label}</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0 text-[10px] text-[#e8eefb]/40">
                    {entry.hint && <span className="truncate max-w-40">{entry.hint}</span>}
                    {active && <CornerDownLeft className="w-3 h-3 text-[#6ea8ff]" />}
                  </span>
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
