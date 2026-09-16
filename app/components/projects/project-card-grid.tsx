"use client";

import React from "react";
import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { EmptyState } from "@/app/components/ui/empty-state";
import type { VaultData } from "@/app/lib/vault-data.types";
import { formatDate } from "@/app/lib/format";

interface ProjectCardGridProps {
  data: VaultData;
}

export function ProjectCardGrid({ data }: ProjectCardGridProps) {
  if (data.projects.length === 0) {
    return <EmptyState message="no encrypted projects yet." hint="Create a project to add .env bundles, notes, and tasks." />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {data.projects.map((project) => {
        const envBundles = data.envBundles.filter((bundle) => bundle.projectId === project.id);
        const counts = {
          secrets: data.secrets.filter((item) => item.projectId === project.id).length,
          notes: data.notes.filter((note) => note.projectId === project.id).length,
          openTasks: data.tasks.filter((task) => task.projectId === project.id && !task.done).length,
        };
        return (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="group rounded-lg border border-accent/25 bg-surface/85 backdrop-blur-md p-4 font-mono hover:border-accent/60 hover:shadow-[0_0_30px_rgba(110,168,255,0.12)] transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <FolderKanban className="w-4 h-4 text-accent shrink-0" />
                <h3 className="text-sm font-bold text-foreground truncate">{project.name}</h3>
              </div>
              <span className="text-accent group-hover:translate-x-0.5 transition-transform">→</span>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-2 min-h-8">{project.description}</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {envBundles.map((bundle) => (
                <span
                  key={bundle.id}
                  className="rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] tracking-widest text-sky-700 dark:text-sky-300"
                >
                  .env.{bundle.environment}
                </span>
              ))}
              {envBundles.length === 0 && (
                <span className="text-[10px] text-subtle-foreground">no .env bundles</span>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-accent/10 flex items-center justify-between text-[10px] tracking-wider text-subtle-foreground">
              <span>
                <b className="text-accent">{counts.secrets}</b> secrets ·{" "}
                <b className="text-violet-700 dark:text-violet-300">{counts.notes}</b> notes ·{" "}
                <b className="text-emerald-700 dark:text-emerald-300">{counts.openTasks}</b> open
              </span>
              <span>{formatDate(project.updatedAt)}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
