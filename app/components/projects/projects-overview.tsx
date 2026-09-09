"use client";

import React from "react";
import { Plus } from "lucide-react";
import { PageHeading } from "@/app/components/ui/page-heading";
import { ProjectCardGrid } from "@/app/components/projects/project-card-grid";
import { useUnlockedVault } from "@/app/lib/vault-session";

export function ProjectsOverview() {
  const data = useUnlockedVault();

  const newButton = (
    <button
      type="button"
      disabled
      title="Creation arrives with the ciphertext API phase"
      className="inline-flex items-center gap-1.5 rounded border border-[#6ea8ff]/30 bg-[#0a1220]/70 px-3 py-1.5 font-mono text-xs tracking-wider text-[#e8eefb]/60 disabled:cursor-not-allowed"
    >
      <Plus className="w-3.5 h-3.5" /> NEW PROJECT
    </button>
  );

  return (
    <div className="space-y-4">
      <PageHeading
        eyebrow="PROJECTS"
        title="Projects & .env"
        description="Each project groups its .env bundles, linked secrets, notes, and tasks. Names and descriptions are encrypted."
        actions={newButton}
      />
      <ProjectCardGrid data={data} />
    </div>
  );
}
