"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "@/app/components/ui/modal";
import { PageHeading } from "@/app/components/ui/page-heading";
import { ProjectCardGrid } from "@/app/components/projects/project-card-grid";
import { useUnlockedVault, useVaultSession } from "@/app/lib/vault-session";
import type { ProjectInput } from "@/app/lib/workspace.types";
import { ProjectForm } from "./project-form";

export function ProjectsOverview() {
  const data = useUnlockedVault();
  const { createProject } = useVaultSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const createRequested = searchParams.get("create") === "1";
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSave = async (input: ProjectInput) => {
    setIsSaving(true);
    setActionError(null);
    try {
      await createProject(input);
      setShowForm(false);
      if (createRequested) router.replace("/projects");
    } catch {
      setActionError("The encrypted project could not be saved. No plaintext was sent.");
    } finally {
      setIsSaving(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setActionError(null);
    if (createRequested) router.replace("/projects");
  };

  const newButton = (
    <button
      type="button"
      onClick={() => {
        setActionError(null);
        setShowForm(true);
      }}
      className="inline-flex min-h-10 items-center gap-1.5 rounded border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-xs tracking-wider text-foreground hover:bg-accent/20"
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
      <Modal
        isOpen={showForm || createRequested}
        onClose={closeForm}
        title="NEW PROJECT"
        status="ENCRYPTS IN THIS TAB"
        description="The project name and description are encrypted locally as one payload before saving."
        icon={<Plus className="h-4 w-4" />}
        maxWidth="lg"
        closeDisabled={isSaving}
      >
        <ProjectForm
          isSaving={isSaving}
          requestError={actionError}
          onCancel={closeForm}
          onSubmit={handleSave}
        />
      </Modal>
      <ProjectCardGrid data={data} />
    </div>
  );
}
