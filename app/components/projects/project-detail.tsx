"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Modal } from "@/app/components/ui/modal";
import { PageHeading } from "@/app/components/ui/page-heading";
import { useUnlockedVault, useVaultSession } from "@/app/lib/vault-session";
import type { ProjectInput } from "@/app/lib/workspace.types";
import { WorkspaceRequestError } from "@/app/lib/workspace-client";
import { ProjectEnvWorkspace } from "./project-env-workspace";
import { ProjectForm } from "./project-form";
import { ProjectNotesWorkspace } from "./project-notes-workspace";
import { ProjectSecretsWorkspace } from "./project-secrets-workspace";
import { ProjectTasksWorkspace } from "./project-tasks-workspace";
import {
  PROJECT_WORKSPACE_TABS,
  type ProjectWorkspaceTab,
} from "./project-workspace-shell";

interface ProjectDetailProps {
  projectId: string;
}

function parseProjectTab(value: string | null): ProjectWorkspaceTab {
  return PROJECT_WORKSPACE_TABS.includes(value as ProjectWorkspaceTab)
    ? value as ProjectWorkspaceTab
    : "env";
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const data = useUnlockedVault();
  const { deleteProject, touchRecent, updateProject } = useVaultSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [editingProject, setEditingProject] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const project = data.projects.find((candidate) => candidate.id === projectId) ?? null;
  const activeTab = parseProjectTab(searchParams.get("tab"));

  useEffect(() => {
    if (project) touchRecent("project", project.id);
  }, [project, touchRecent]);

  const counts = useMemo<Record<ProjectWorkspaceTab, number>>(() => ({
    env: data.envBundles.filter((bundle) => bundle.projectId === projectId).length,
    secrets: data.secrets.filter((item) => item.projectId === projectId).length,
    notes: data.notes.filter((note) => note.projectId === projectId).length,
    tasks: data.tasks.filter((task) => task.projectId === projectId).length,
  }), [data.envBundles, data.notes, data.secrets, data.tasks, projectId]);

  const updateWorkspaceUrl = useCallback((
    tab: ProjectWorkspaceTab,
    selection?: { key: "bundle" | "item" | "note"; id: string | null },
    replace = false,
  ) => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (selection?.id) params.set(selection.key, selection.id);
    const nextUrl = `${pathname}?${params.toString()}`;
    if (replace) window.history.replaceState(null, "", nextUrl);
    else window.history.pushState(null, "", nextUrl);
  }, [pathname]);

  const selectEnvBundle = useCallback(
    (id: string | null, replace = false) => updateWorkspaceUrl("env", { key: "bundle", id }, replace),
    [updateWorkspaceUrl],
  );
  const selectSecret = useCallback(
    (id: string | null, replace = false) => updateWorkspaceUrl("secrets", { key: "item", id }, replace),
    [updateWorkspaceUrl],
  );
  const selectNote = useCallback(
    (id: string | null, replace = false) => updateWorkspaceUrl("notes", { key: "note", id }, replace),
    [updateWorkspaceUrl],
  );

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

  const handleProjectSave = async (input: ProjectInput) => {
    setIsSaving(true);
    setActionError(null);
    try {
      await updateProject(project.id, input);
      setEditingProject(false);
    } catch {
      setActionError("The encrypted project could not be updated.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleProjectDelete = async () => {
    if (!window.confirm("Permanently delete this encrypted project? Linked secrets, .env bundles, notes, and tasks must be removed first.")) return;

    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteProject(project.id);
      router.replace("/projects");
    } catch (error) {
      setActionError(error instanceof WorkspaceRequestError && error.status === 409
        ? "Remove linked secrets, .env bundles, notes, and tasks before deleting this project."
        : "The encrypted project could not be deleted.");
    } finally {
      setIsDeleting(false);
    }
  };

  const projectActions = (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={() => {
          setActionError(null);
          setEditingProject(true);
        }}
        disabled={isDeleting}
        className="inline-flex min-h-10 items-center gap-1 rounded border border-accent/20 px-2 py-1 text-[10px] tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        <Pencil className="h-3 w-3" /> EDIT
      </button>
      <button
        type="button"
        disabled={isDeleting}
        onClick={() => void handleProjectDelete()}
        className="inline-flex min-h-10 items-center gap-1 rounded border border-rose-400/20 px-2 py-1 text-[10px] tracking-widest text-rose-300/75 hover:text-rose-200 disabled:opacity-50"
      >
        <Trash2 className="h-3 w-3" /> {isDeleting ? "DELETING…" : "DELETE"}
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <BackLink />
      <PageHeading eyebrow="PROJECT" title={project.name} description={project.description} actions={projectActions} />

      <Modal
        isOpen={editingProject}
        onClose={() => {
          setEditingProject(false);
          setActionError(null);
        }}
        title="EDIT PROJECT"
        status="ENCRYPTS IN THIS TAB"
        description="Update the locally encrypted project payload without changing its linked records."
        icon={<Pencil className="h-4 w-4" />}
        maxWidth="lg"
        closeDisabled={isSaving}
      >
        <ProjectForm
          key={project.id}
          project={project}
          isSaving={isSaving}
          requestError={actionError}
          onCancel={() => {
            setEditingProject(false);
            setActionError(null);
          }}
          onSubmit={handleProjectSave}
        />
      </Modal>

      {actionError && !editingProject && <p role="alert" className="text-xs text-rose-300">{actionError}</p>}

      {activeTab === "env" && (
        <ProjectEnvWorkspace
          project={project}
          counts={counts}
          selectedBundleId={searchParams.get("bundle")}
          onTabChange={updateWorkspaceUrl}
          onSelectionChange={selectEnvBundle}
        />
      )}
      {activeTab === "secrets" && (
        <ProjectSecretsWorkspace
          project={project}
          counts={counts}
          selectedItemId={searchParams.get("item")}
          onTabChange={updateWorkspaceUrl}
          onSelectionChange={selectSecret}
        />
      )}
      {activeTab === "notes" && (
        <ProjectNotesWorkspace
          project={project}
          counts={counts}
          selectedNoteId={searchParams.get("note")}
          onTabChange={updateWorkspaceUrl}
          onSelectionChange={selectNote}
        />
      )}
      {activeTab === "tasks" && (
        <ProjectTasksWorkspace
          project={project}
          counts={counts}
          onTabChange={updateWorkspaceUrl}
        />
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/projects"
      className="inline-flex min-h-10 items-center gap-1.5 font-mono text-[10px] tracking-widest text-accent hover:text-accent"
    >
      <ArrowLeft className="h-3 w-3" /> ALL PROJECTS
    </Link>
  );
}
