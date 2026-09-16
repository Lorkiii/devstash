"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Boxes, Braces, FileText, KeyRound, ListTodo, Plus } from "lucide-react";
import { EmptyState } from "@/app/components/ui/empty-state";
import { formatDate } from "@/app/lib/format";
import type { VaultData } from "@/app/lib/vault-data.types";

interface ProjectsStripProps {
  data: VaultData;
  limit?: number;
}

const PROJECT_ACCENTS = [
  "from-accent/12 via-transparent to-transparent border-accent/20",
  "from-violet-400/12 via-transparent to-transparent border-violet-400/20",
  "from-cyan-400/10 via-transparent to-transparent border-cyan-400/20",
] as const;

export function ProjectsStrip({ data, limit = 6 }: ProjectsStripProps) {
  const projects = [...data.projects]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
  const remainingProjects = Math.max(0, data.projects.length - projects.length);

  return (
    <section aria-labelledby="project-constellation-title" className="overflow-hidden rounded-xl border border-accent/20 bg-surface/85 shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
      <header className="flex flex-col gap-3 border-b border-accent/15 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
        <div>
          <p className="font-mono text-[9px] tracking-[0.2em] text-violet-300/60">CONNECTED PRIVATE WORKSPACES</p>
          <h2 id="project-constellation-title" className="mt-1 text-lg font-bold tracking-tight text-foreground">Project constellation</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[9px] tracking-widest text-subtle-foreground">{data.projects.length} TOTAL</span>
          <Link href="/projects" className="group inline-flex min-h-9 items-center gap-1.5 rounded border border-accent/20 px-2.5 font-mono text-[9px] tracking-widest text-accent-strong transition-colors hover:border-accent/45 hover:text-foreground">
            VIEW ALL
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </header>

      <div className="p-4 sm:p-5">
        {projects.length === 0 ? (
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <EmptyState
              message="No project workspaces yet."
              hint="Create one to connect secrets, environment bundles, notes, and tasks around a single private context."
              className="min-h-32 flex flex-col justify-center"
            />
            <Link href="/projects?create=1" className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-violet-400/30 bg-violet-400/10 px-4 font-mono text-[10px] tracking-widest text-violet-100 hover:bg-violet-400/15">
              <Plus className="h-3.5 w-3.5" />
              CREATE FIRST PROJECT
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {projects.map((project, index) => {
              const counts = {
                env: data.envBundles.filter((bundle) => bundle.projectId === project.id).length,
                secrets: data.secrets.filter((item) => item.projectId === project.id).length,
                notes: data.notes.filter((note) => note.projectId === project.id).length,
                tasks: data.tasks.filter((task) => task.projectId === project.id && !task.done).length,
              };
              const linkedRecords = counts.env + counts.secrets + counts.notes + counts.tasks;

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className={`group relative min-h-48 overflow-hidden rounded-lg border bg-gradient-to-br p-4 transition-all hover:-translate-y-0.5 hover:border-accent/45 hover:shadow-[0_14px_35px_rgba(0,0,0,0.28)] sm:p-5 ${PROJECT_ACCENTS[index % PROJECT_ACCENTS.length]}`}
                >
                  <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full border border-current opacity-[0.04]" />
                  <div className="pointer-events-none absolute -right-3 top-8 h-20 w-20 rounded-full border border-current opacity-[0.04]" />

                  <div className="relative flex items-start justify-between gap-4">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded border border-foreground/10 bg-surface-inset/65 text-accent-strong">
                      <Boxes className="h-4 w-4" />
                    </span>
                    <span className="font-mono text-[9px] tracking-[0.2em] text-subtle-foreground">
                      PROJECT / {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="relative mt-5">
                    <h3 className="truncate text-base font-bold text-foreground transition-colors group-hover:text-accent">{project.name}</h3>
                    <p className="mt-1.5 line-clamp-2 min-h-9 text-xs leading-[1.125rem] text-subtle-foreground">
                      {project.description || "No project description."}
                    </p>
                  </div>

                  <div className="relative mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[9px] tracking-wider text-subtle-foreground">
                    <span className="inline-flex items-center gap-1"><Braces className="h-3 w-3 text-cyan-300" />{counts.env}</span>
                    <span className="inline-flex items-center gap-1"><KeyRound className="h-3 w-3 text-accent-strong" />{counts.secrets}</span>
                    <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3 text-amber-200" />{counts.notes}</span>
                    <span className="inline-flex items-center gap-1"><ListTodo className="h-3 w-3 text-emerald-300" />{counts.tasks}</span>
                    <span className="ml-auto text-subtle-foreground">{linkedRecords} LINKED</span>
                  </div>

                  <div className="relative mt-3 flex items-center justify-between border-t border-foreground/[0.07] pt-3 font-mono text-[8px] tracking-widest text-subtle-foreground">
                    <span>UPDATED {formatDate(project.updatedAt)}</span>
                    <span className="inline-flex items-center gap-1 text-accent-strong/60 transition-colors group-hover:text-accent-strong">
                      ENTER <ArrowRight className="h-2.5 w-2.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {remainingProjects > 0 && (
        <footer className="border-t border-accent/10 bg-surface-inset/45 px-5 py-3 text-center font-mono text-[9px] tracking-widest text-subtle-foreground">
          + {remainingProjects} MORE PRIVATE {remainingProjects === 1 ? "WORKSPACE" : "WORKSPACES"} IN PROJECTS
        </footer>
      )}
    </section>
  );
}
