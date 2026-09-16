"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Lock, Search, X } from "lucide-react";
import type { VaultData } from "@/app/lib/vault-data.types";
import { buildLocalSearchIndex, searchLocalIndex, type LocalSearchKind } from "@/app/lib/local-search";
import { NAV_ITEMS } from "../nav-items";

// The parent mounts this only while open, so local state is fresh per open.
interface CommandPaletteProps {
  onClose: () => void;
  data: VaultData;
  onLock: () => void;
}

interface PaletteEntry {
  id: string;
  group: "Actions" | "Secrets" | "Projects" | "Environments" | "Notes" | "Tasks";
  label: string;
  hint?: string;
  run: () => void;
}

const MAX_RESULTS = 12;

const SEARCH_GROUPS: Record<LocalSearchKind, PaletteEntry["group"]> = {
  secret: "Secrets",
  project: "Projects",
  environment: "Environments",
  note: "Notes",
  task: "Tasks",
};

// Local search over decrypted records already in memory plus navigation
// commands. Matching happens entirely in the browser; the query is never sent
// anywhere. Secret values may match, but are never rendered in result rows.
export function CommandPalette({ onClose, data, onLock }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState<string>("");
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const updateQuery = (next: string) => {
    setQuery(next);
    setActiveIndex(0);
  };

  const searchIndex = useMemo(() => buildLocalSearchIndex(data), [data]);

  const actions = useMemo<PaletteEntry[]>(() => {
    const go = (href: string) => () => {
      router.push(href);
      onClose();
    };
    return [
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
  }, [router, onClose, onLock]);

  const results = useMemo(() => {
    if (!query.trim()) return actions.slice(0, MAX_RESULTS);
    return searchLocalIndex(searchIndex, query, MAX_RESULTS).map((result) => ({
      id: `${result.kind}-${result.id}`,
      group: SEARCH_GROUPS[result.kind],
      label: result.label,
      hint: result.context,
      run: () => {
        router.push(result.href);
        onClose();
      },
    }));
  }, [actions, onClose, query, router, searchIndex]);

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
        className="w-full max-w-xl rounded-lg border border-accent/40 bg-surface shadow-[0_0_50px_rgba(110,168,255,0.2)] font-mono text-foreground overflow-hidden"
      >
        <div className="flex items-center gap-3 border-b border-accent/20 px-4 py-3">
          <Search className="w-4 h-4 text-accent" />
          <input
            autoFocus
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Search records or type a command…"
            aria-label="Search records or commands"
            autoComplete="off"
            spellCheck={false}
            aria-controls="command-palette-results"
            aria-activedescendant={results[activeIndex] ? `command-result-${results[activeIndex].id}` : undefined}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none"
          />
          <kbd className="rounded border border-accent/25 px-1.5 py-0.5 text-[10px] text-subtle-foreground">ESC</kbd>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded border border-accent/20 text-muted-foreground hover:border-accent/50 hover:text-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="sr-only" role="status">{results.length} local results</p>
        <ul id="command-palette-results" role="listbox" aria-label="Results" className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 && (
            <li className="px-4 py-6 text-xs text-subtle-foreground">
              <span className="text-accent mr-2">&gt;</span>no matches in memory
            </li>
          )}
          {results.map((entry, index) => {
            const showGroup = index === 0 || results[index - 1]?.group !== entry.group;
            const active = index === activeIndex;
            return (
              <React.Fragment key={entry.id}>
                {showGroup && (
                  <li role="presentation" aria-hidden="true" className="px-4 pt-2 pb-1 text-[10px] tracking-widest text-subtle-foreground">
                    {entry.group.toUpperCase()}
                  </li>
                )}
                <li
                  id={`command-result-${entry.id}`}
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={entry.run}
                  className={`mx-2 flex items-center justify-between gap-3 rounded px-3 py-2 text-xs cursor-pointer ${
                    active ? "bg-accent/15 text-foreground" : "text-muted-foreground hover:bg-accent/5"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {entry.id === "lock" && <Lock className="w-3.5 h-3.5 text-amber-300" />}
                    <span className="truncate">{entry.label}</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0 text-[10px] text-subtle-foreground">
                    {entry.hint && <span className="truncate max-w-40">{entry.hint}</span>}
                    {active && <CornerDownLeft className="w-3 h-3 text-accent" />}
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
