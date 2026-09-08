"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { EmptyState } from "@/app/components/ui/empty-state";
import { PageHeading } from "@/app/components/ui/page-heading";
import { TypeBadge } from "@/app/components/ui/type-badge";
import { useUnlockedVault, useVaultSession } from "@/app/lib/vault-session";
import { formatDate } from "@/app/lib/format";
import { EnvBundleViewer } from "./env-bundle-viewer";

type ProjectTab = "env" | "secrets" | "notes" | "tasks";

interface ProjectDetailProps {
  projectId: string;
}

const TABS: { id: ProjectTab; label: string }[] = [
  { id: "env", label: ".ENV" },
  { id: "secrets", label: "SECRETS" },
  { id: "notes", label: "NOTES" },
  { id: "tasks", label: "TASKS" },
];

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const data = useUnlockedVault();
  const { touchRecent } = useVaultSession();
  const [tab, setTab] = useState<ProjectTab>("env");

  const project = data.projects.find((candidate) => candidate.id === projectId) ?? null;

  useEffect(() => {
    if (project) touchRecent("project", project.id);
  }, [project, touchRecent]);

  if (!project) {
    return (
      <div className="space-y-4">
        <BackLink />
        <ConsolePanel title="PROJECT" tone="muted">
          <EmptyState message="no project with that id in memory." hint="It may have been deleted, or the link is stale." />
        </ConsolePanel>
      </div>
    );
  }

  const envBundles = data.envBundles.filter((bundle) => bundle.projectId === project.id);
  const secrets = data.secrets.filter((item) => item.projectId === project.id);
  const notes = data.notes.filter((note) => note.projectId === project.id);
  const tasks = data.tasks.filter((task) => task.projectId === project.id).sort((a, b) => a.sortOrder - b.sortOrder);

  const tabCount: Record<ProjectTab, number> = {
    env: envBundles.length,
    secrets: secrets.length,
    notes: notes.length,
    tasks: tasks.filter((task) => !task.done).length,
  };

  const tabList = (
    <div role="tablist" aria-label="Project sections" className="flex items-center gap-1">
      {TABS.map((entry) => {
        const active = tab === entry.id;
        return (
          <button
            key={entry.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => setTab(entry.id)}
            className={`rounded px-2 py-1 font-mono text-[10px] tracking-widest transition-colors cursor-pointer ${
              active ? "bg-[#6ea8ff]/15 text-[#e8eefb]" : "text-[#e8eefb]/50 hover:text-[#e8eefb]"
            }`}
          >
            {entry.label} <span className="opacity-60">{tabCount[entry.id]}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <BackLink />
      <PageHeading eyebrow="PROJECT" title={project.name} description={project.description} />

      <ConsolePanel title="WORKSPACE" status={`updated ${formatDate(project.updatedAt)}`} action={tabList}>
        {tab === "env" && (
          <div className="space-y-3">
            {envBundles.length === 0 ? (
              <EmptyState message="no .env bundles for this project." />
            ) : (
              envBundles.map((bundle) => <EnvBundleViewer key={bundle.id} bundle={bundle} />)
            )}
          </div>
        )}

        {tab === "secrets" &&
          (secrets.length === 0 ? (
            <EmptyState message="no secrets linked to this project." />
          ) : (
            <ul className="divide-y divide-[#6ea8ff]/10">
              {secrets.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/vault?item=${item.id}`}
                    className="flex items-center gap-3 py-2.5 text-xs text-[#e8eefb]/85 hover:text-[#6ea8ff] transition-colors"
                  >
                    <TypeBadge type={item.type} className="w-[68px] justify-center shrink-0" />
                    <span className="flex-1 truncate">{item.title}</span>
                    <span className="text-[10px] text-[#e8eefb]/40">{formatDate(item.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ))}

        {tab === "notes" &&
          (notes.length === 0 ? (
            <EmptyState message="no notes for this project." />
          ) : (
            <ul className="divide-y divide-[#6ea8ff]/10">
              {notes.map((note) => (
                <li key={note.id}>
                  <Link
                    href={`/notes?note=${note.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-xs text-[#e8eefb]/85 hover:text-[#6ea8ff] transition-colors"
                  >
                    <span className="truncate">{note.title}</span>
                    <span className="text-[10px] text-[#e8eefb]/40 shrink-0">
                      {note.tags.map((tag) => `#${tag}`).join(" ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ))}

        {tab === "tasks" &&
          (tasks.length === 0 ? (
            <EmptyState message="no tasks for this project." />
          ) : (
            <ul className="divide-y divide-[#6ea8ff]/10">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 py-2.5 text-xs">
                  <span
                    aria-hidden="true"
                    className={`w-3.5 h-3.5 rounded-sm border shrink-0 ${
                      task.done ? "border-emerald-400/60 bg-emerald-400/30" : "border-[#6ea8ff]/40"
                    }`}
                  />
                  <span className={`flex-1 truncate ${task.done ? "text-[#e8eefb]/40 line-through" : "text-[#e8eefb]/85"}`}>
                    {task.title}
                  </span>
                  <span className="text-[10px] text-[#e8eefb]/45 shrink-0">{task.dueDate ?? ""}</span>
                </li>
              ))}
            </ul>
          ))}
      </ConsolePanel>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/projects"
      className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-[#6ea8ff]/80 hover:text-[#6ea8ff]"
    >
      <ArrowLeft className="w-3 h-3" /> ALL PROJECTS
    </Link>
  );
}
