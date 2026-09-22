"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Braces, FileText, KeyRound, ListTodo } from "lucide-react";
import { EmptyState } from "@/app/components/ui/empty-state";
import type { VaultData } from "@/app/lib/vault-data.types";
import { formatDate } from "@/app/lib/format";

interface ProjectCardGridProps {
  data: VaultData;
}

const PROJECT_ACCENTS = [
  "border-cyan-400/30 bg-cyan-400/10 text-cyan-700 dark:text-cyan-200",
  "border-violet-400/30 bg-violet-400/10 text-violet-700 dark:text-violet-200",
  "border-amber-400/30 bg-amber-400/10 text-amber-800 dark:text-amber-200",
  "border-emerald-400/30 bg-emerald-400/10 text-emerald-700 dark:text-emerald-200",
] as const;

export function ProjectCardGrid({ data }: ProjectCardGridProps) {
  if (data.projects.length === 0) {
    return <EmptyState message="no encrypted projects yet." hint="Create a project to add .env bundles, notes, and tasks." />;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
      {data.projects.map((project, index) => {
        const envBundles = data.envBundles.filter((bundle) => bundle.projectId === project.id);
        const counts = {
          env: envBundles.length,
          secrets: data.secrets.filter((item) => item.projectId === project.id).length,
          notes: data.notes.filter((note) => note.projectId === project.id).length,
          openTasks: data.tasks.filter((task) => task.projectId === project.id && !task.done).length,
        };
        const accent = PROJECT_ACCENTS[index % PROJECT_ACCENTS.length];
        return (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="devstash-panel devstash-panel-link group overflow-hidden rounded-2xl border p-3 font-mono sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
                <span className={`grid h-9 w-9 place-items-center rounded-lg border sm:h-10 sm:w-10 ${accent}`}>
                  <Braces className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="font-mono text-[9px] tracking-[0.18em] text-subtle-foreground">
                  WORKSPACE / {String(index + 1).padStart(2, "0")}
                </span>
              </div>

              <h3 className="mt-3 truncate text-sm font-bold tracking-tight text-foreground group-hover:text-accent sm:mt-4 sm:text-base">
                {project.name}
              </h3>
              <p className="mt-1 line-clamp-2 min-h-8 font-sans text-[11px] leading-4 text-muted-foreground sm:min-h-9 sm:text-xs sm:leading-5">
                {project.description || "No project description."}
              </p>

              <div className="mt-3 flex flex-wrap gap-1 sm:mt-4 sm:gap-1.5">
                {envBundles.map((bundle) => (
                  <span
                    key={bundle.id}
                    className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[9px] tracking-widest text-cyan-800 dark:text-cyan-200 sm:text-[10px]"
                  >
                    .env.{bundle.environment}
                  </span>
                ))}
                {envBundles.length === 0 && (
                  <span className="text-[9px] tracking-wider text-subtle-foreground sm:text-[10px]">no .env bundles yet</span>
                )}
              </div>

              <dl className="mt-3 grid grid-cols-4 gap-1 border-t border-accent/10 pt-3 sm:mt-4 sm:pt-4">
                <div className="min-w-0 text-center">
                  <dt className="text-[8px] tracking-widest text-subtle-foreground">.ENV</dt>
                  <dd className="mt-0.5 text-sm font-bold text-cyan-700 dark:text-cyan-300">{counts.env}</dd>
                </div>
                <div className="min-w-0 text-center">
                  <dt className="inline-flex items-center justify-center gap-0.5 text-[8px] tracking-widest text-subtle-foreground">
                    <KeyRound className="h-2.5 w-2.5" aria-hidden="true" /> KEYS
                  </dt>
                  <dd className="mt-0.5 text-sm font-bold text-violet-700 dark:text-violet-300">{counts.secrets}</dd>
                </div>
                <div className="min-w-0 text-center">
                  <dt className="inline-flex items-center justify-center gap-0.5 text-[8px] tracking-widest text-subtle-foreground">
                    <FileText className="h-2.5 w-2.5" aria-hidden="true" /> NOTES
                  </dt>
                  <dd className="mt-0.5 text-sm font-bold text-amber-700 dark:text-amber-300">{counts.notes}</dd>
                </div>
                <div className="min-w-0 text-center">
                  <dt className="inline-flex items-center justify-center gap-0.5 text-[8px] tracking-widest text-subtle-foreground">
                    <ListTodo className="h-2.5 w-2.5" aria-hidden="true" /> OPEN
                  </dt>
                  <dd className="mt-0.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">{counts.openTasks}</dd>
                </div>
              </dl>

              <div className="mt-3 flex items-center justify-between font-mono text-[9px] tracking-widest text-subtle-foreground sm:mt-4">
                <span>UPDATED {formatDate(project.updatedAt)}</span>
                <span className="inline-flex items-center gap-1 text-accent-strong/70 transition-colors group-hover:text-accent-strong">
                  OPEN <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
          </Link>
        );
      })}
    </div>
  );
}
