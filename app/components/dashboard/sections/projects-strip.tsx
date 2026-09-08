"use client";

import React from "react";
import Link from "next/link";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import type { VaultData } from "@/app/lib/vault-data.types";

interface ProjectsStripProps {
  data: VaultData;
}

export function ProjectsStrip({ data }: ProjectsStripProps) {
  const viewAll = (
    <Link href="/projects" className="text-[10px] tracking-widest text-[#6ea8ff]/80 hover:text-[#6ea8ff]">
      VIEW ALL →
    </Link>
  );

  return (
    <ConsolePanel title="PROJECTS" status={`${data.projects.length} TOTAL`} action={viewAll}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {data.projects.map((project) => {
          const counts = {
            env: data.envBundles.filter((bundle) => bundle.projectId === project.id).length,
            secrets: data.secrets.filter((item) => item.projectId === project.id).length,
            notes: data.notes.filter((note) => note.projectId === project.id).length,
            tasks: data.tasks.filter((task) => task.projectId === project.id && !task.done).length,
          };
          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group rounded border border-[#6ea8ff]/20 bg-[#070d18]/70 px-3 py-3 hover:border-[#6ea8ff]/60 hover:bg-[#0d1b32] transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-[#e8eefb] truncate">{project.name}</span>
                <span className="text-[#6ea8ff] text-xs group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
              <p className="text-[10px] text-[#e8eefb]/50 line-clamp-2 min-h-7">{project.description}</p>
              <div className="mt-2 flex items-center gap-3 text-[10px] tracking-wider text-[#e8eefb]/55">
                <span><b className="text-[#38bdf8]">{counts.env}</b> env</span>
                <span><b className="text-[#6ea8ff]">{counts.secrets}</b> secrets</span>
                <span><b className="text-[#a78bfa]">{counts.notes}</b> notes</span>
                <span><b className="text-[#10b981]">{counts.tasks}</b> open</span>
              </div>
            </Link>
          );
        })}
      </div>
    </ConsolePanel>
  );
}
