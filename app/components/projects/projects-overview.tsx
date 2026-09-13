"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeading } from "@/app/components/ui/page-heading";
import { ProjectCardGrid } from "@/app/components/projects/project-card-grid";
import { useUnlockedVault, useVaultSession } from "@/app/lib/vault-session";
import type { ProjectInput } from "@/app/lib/workspace.types";
import { ProjectForm } from "./project-form";

export function ProjectsOverview() {
  const data = useUnlockedVault();
  const { createProject } = useVaultSession();
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSave = async (input: ProjectInput) => {
    setIsSaving(true);
    setActionError(null);
    try {
      await createProject(input);
      setShowForm(false);
    } catch {
      setActionError("The encrypted project could not be saved. No plaintext was sent.");
    } finally {
      setIsSaving(false);
    }
  };

  const newButton = (
    <button
      type="button"
      onClick={() => {
        setActionError(null);
        setShowForm(true);
      }}
      className="inline-flex items-center gap-1.5 rounded border border-[#6ea8ff]/40 bg-[#6ea8ff]/10 px-3 py-1.5 font-mono text-xs tracking-wider text-[#e8eefb] hover:bg-[#6ea8ff]/20"
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
      {showForm && (
        <ProjectForm
          isSaving={isSaving}
          requestError={actionError}
          onCancel={() => {
            setShowForm(false);
            setActionError(null);
          }}
          onSubmit={handleSave}
        />
      )}
      <ProjectCardGrid data={data} />
    </div>
  );
}
