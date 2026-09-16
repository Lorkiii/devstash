"use client";

import React from "react";
import {
  CheckSquare2,
  FileCode2,
  FileText,
  KeyRound,
  type LucideIcon,
} from "lucide-react";

export type ProjectWorkspaceTab = "env" | "secrets" | "notes" | "tasks";

interface WorkspaceMeta {
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  activeClass: string;
  iconClass: string;
  countClass: string;
  lineClass: string;
}

export const PROJECT_WORKSPACE_TABS: ProjectWorkspaceTab[] = [
  "env",
  "secrets",
  "notes",
  "tasks",
];

const WORKSPACE_META: Record<ProjectWorkspaceTab, WorkspaceMeta> = {
  env: {
    label: ".ENV",
    title: "Environment workspace",
    description: "Manage complete encrypted environment files and reveal their contents only when needed.",
    icon: FileCode2,
    activeClass: "border-cyan-400/70 bg-cyan-400/10 text-cyan-800 dark:text-cyan-100",
    iconClass: "border-cyan-400/30 bg-cyan-400/10 text-cyan-700 dark:text-cyan-300",
    countClass: "bg-cyan-400/15 text-cyan-700 dark:text-cyan-200",
    lineClass: "via-cyan-400/80",
  },
  secrets: {
    label: "SECRETS",
    title: "Secrets workspace",
    description: "Inspect and manage project-linked secrets while keeping sensitive values masked by default.",
    icon: KeyRound,
    activeClass: "border-violet-400/70 bg-violet-400/10 text-violet-800 dark:text-violet-100",
    iconClass: "border-violet-400/30 bg-violet-400/10 text-violet-700 dark:text-violet-300",
    countClass: "bg-violet-400/15 text-violet-700 dark:text-violet-200",
    lineClass: "via-violet-400/80",
  },
  notes: {
    label: "NOTES",
    title: "Notes workspace",
    description: "Search, read, and update the private notes that belong to this project.",
    icon: FileText,
    activeClass: "border-amber-400/70 bg-amber-400/10 text-amber-800 dark:text-amber-100",
    iconClass: "border-amber-400/30 bg-amber-400/10 text-amber-700 dark:text-amber-300",
    countClass: "bg-amber-400/15 text-amber-700 dark:text-amber-200",
    lineClass: "via-amber-400/80",
  },
  tasks: {
    label: "TASKS",
    title: "Tasks workspace",
    description: "Plan project work, track open items, and keep completed tasks available on demand.",
    icon: CheckSquare2,
    activeClass: "border-emerald-400/70 bg-emerald-400/10 text-emerald-800 dark:text-emerald-100",
    iconClass: "border-emerald-400/30 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300",
    countClass: "bg-emerald-400/15 text-emerald-700 dark:text-emerald-200",
    lineClass: "via-emerald-400/80",
  },
};

interface ProjectWorkspaceShellProps {
  activeTab: ProjectWorkspaceTab;
  counts: Record<ProjectWorkspaceTab, number>;
  status: string;
  action: React.ReactNode;
  onTabChange: (tab: ProjectWorkspaceTab) => void;
  children: React.ReactNode;
}

export function ProjectWorkspaceShell({
  activeTab,
  counts,
  status,
  action,
  onTabChange,
  children,
}: ProjectWorkspaceShellProps) {
  const activeMeta = WORKSPACE_META[activeTab];
  const ActiveIcon = activeMeta.icon;

  const moveTabFocus = (currentIndex: number, key: string) => {
    let nextIndex = currentIndex;
    if (key === "ArrowRight") nextIndex = (currentIndex + 1) % PROJECT_WORKSPACE_TABS.length;
    else if (key === "ArrowLeft") nextIndex = (currentIndex - 1 + PROJECT_WORKSPACE_TABS.length) % PROJECT_WORKSPACE_TABS.length;
    else if (key === "Home") nextIndex = 0;
    else if (key === "End") nextIndex = PROJECT_WORKSPACE_TABS.length - 1;
    else return;

    const nextTab = PROJECT_WORKSPACE_TABS[nextIndex];
    onTabChange(nextTab);
    window.requestAnimationFrame(() => document.getElementById(`project-tab-${nextTab}`)?.focus());
  };

  return (
    <section data-panel-tone={activeTab} className="devstash-panel overflow-hidden rounded-2xl border font-mono text-foreground">
      <div
        role="tablist"
        aria-label="Project workspaces"
        className="devstash-panel-header flex min-w-0 overflow-x-auto border-b px-2 pt-2 [scrollbar-width:thin] sm:px-3"
      >
        {PROJECT_WORKSPACE_TABS.map((tab, index) => {
          const meta = WORKSPACE_META[tab];
          const Icon = meta.icon;
          const active = activeTab === tab;

          return (
            <button
              key={tab}
              id={`project-tab-${tab}`}
              type="button"
              role="tab"
              aria-controls={`project-panel-${tab}`}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onTabChange(tab)}
              onKeyDown={(event) => {
                if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                  event.preventDefault();
                  moveTabFocus(index, event.key);
                }
              }}
              className={`mr-1 inline-flex min-h-11 shrink-0 items-center gap-2 rounded-t-lg border border-b-0 px-3 py-2 text-[10px] font-semibold tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                active
                  ? meta.activeClass
                  : "border-transparent text-subtle-foreground hover:border-accent/15 hover:bg-accent/5 hover:text-muted-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{meta.label}</span>
              <span className={`rounded px-1.5 py-0.5 text-[9px] ${active ? meta.countClass : "bg-foreground/5 text-subtle-foreground"}`}>
                {counts[tab]}
              </span>
            </button>
          );
        })}
      </div>

      <div
        id={`project-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`project-tab-${activeTab}`}
        tabIndex={0}
        className="min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50"
      >
        <div className={`h-px bg-linear-to-r from-transparent ${activeMeta.lineClass} to-transparent`} aria-hidden="true" />
        <header className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${activeMeta.iconClass}`} aria-hidden="true">
              <ActiveIcon className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="text-sm font-bold tracking-wider text-foreground sm:text-base">{activeMeta.title}</h2>
                <span className="text-[9px] tracking-widest text-subtle-foreground">{status}</span>
              </div>
              <p className="mt-1 max-w-2xl font-sans text-xs leading-relaxed text-subtle-foreground">
                {activeMeta.description}
              </p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:shrink-0 lg:justify-end">
            {action}
          </div>
        </header>

        <div className="min-w-0 border-t border-accent/12">{children}</div>
      </div>
    </section>
  );
}

interface WorkspaceEmptyStateProps {
  message: string;
  hint?: string;
  className?: string;
}

export function WorkspaceEmptyState({ message, hint, className = "" }: WorkspaceEmptyStateProps) {
  return (
    <div className={`px-5 py-12 text-center font-mono ${className}`}>
      <p className="text-xs text-muted-foreground">
        <span className="mr-2 text-accent" aria-hidden="true">&gt;</span>
        {message}
      </p>
      {hint && <p className="mx-auto mt-2 max-w-md font-sans text-xs leading-relaxed text-subtle-foreground">{hint}</p>}
    </div>
  );
}

export const PROJECT_WORKSPACE_PRIMARY_ACTION =
  "inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-semibold tracking-wider text-foreground transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:w-auto";

export const PROJECT_WORKSPACE_ICON_ACTION =
  "inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-accent/20 p-1 text-muted-foreground transition-colors hover:border-accent/45 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50";
