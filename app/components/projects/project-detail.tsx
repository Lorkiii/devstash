"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { EmptyState } from "@/app/components/ui/empty-state";
import { PageHeading } from "@/app/components/ui/page-heading";
import { TypeBadge } from "@/app/components/ui/type-badge";
import { TaskCategoryBadge } from "@/app/components/ui/task-category-badge";
import { useUnlockedVault, useVaultSession } from "@/app/lib/vault-session";
import { formatDate } from "@/app/lib/format";
import type { EnvBundleInput, ProjectInput } from "@/app/lib/workspace.types";
import { WorkspaceRequestError } from "@/app/lib/workspace-client";
import { EnvBundleForm } from "./env-bundle-form";
import { EnvBundleViewer } from "./env-bundle-viewer";
import { ProjectForm } from "./project-form";

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
  const {
    createEnvBundle,
    deleteEnvBundle,
    deleteProject,
    touchRecent,
    updateEnvBundle,
    updateProject,
  } = useVaultSession();
  const router = useRouter();
  const [tab, setTab] = useState<ProjectTab>("env");
  const [editingProject, setEditingProject] = useState(false);
  const [envFormId, setEnvFormId] = useState<"new" | string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
  const taskCategory = (categoryId?: string) =>
    data.taskCategories.find((category) => category.id === categoryId) ?? null;

  const tabCount: Record<ProjectTab, number> = {
    env: envBundles.length,
    secrets: secrets.length,
    notes: notes.length,
    tasks: tasks.filter((task) => !task.done).length,
  };

  const tabList = (
    <div className="flex flex-wrap items-center justify-end gap-1">
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
      {tab === "env" && (
        <button
          type="button"
          onClick={() => {
            setActionError(null);
            setEnvFormId("new");
          }}
          className="inline-flex items-center gap-1 rounded border border-[#38bdf8]/30 px-2 py-1 text-[10px] tracking-widest text-[#38bdf8] hover:bg-[#38bdf8]/10"
        >
          <Plus className="h-3 w-3" /> ADD .ENV
        </button>
      )}
    </div>
  );

  const projectActions = (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => setEditingProject(true)} className="inline-flex items-center gap-1 rounded border border-[#6ea8ff]/20 px-2 py-1 text-[10px] tracking-widest text-[#e8eefb]/70 hover:text-[#e8eefb]">
        <Pencil className="h-3 w-3" /> EDIT
      </button>
      <button
        type="button"
        disabled={deletingId === project.id}
        onClick={async () => {
          if (!window.confirm("Permanently delete this encrypted project? Linked secrets, .env bundles, notes, and tasks must be removed or unassigned first.")) return;
          setDeletingId(project.id);
          setActionError(null);
          try {
            await deleteProject(project.id);
            router.replace("/projects");
          } catch (error) {
            setActionError(error instanceof WorkspaceRequestError && error.status === 409
              ? "Remove or unassign linked secrets, .env bundles, notes, and tasks before deleting this project."
              : "The encrypted project could not be deleted.");
          } finally {
            setDeletingId(null);
          }
        }}
        className="inline-flex items-center gap-1 rounded border border-rose-400/20 px-2 py-1 text-[10px] tracking-widest text-rose-300/75 hover:text-rose-200 disabled:opacity-50"
      >
        <Trash2 className="h-3 w-3" /> DELETE
      </button>
    </div>
  );

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

  const handleEnvSave = async (input: EnvBundleInput) => {
    setIsSaving(true);
    setActionError(null);
    try {
      if (envFormId === "new") await createEnvBundle(input);
      else if (envFormId) await updateEnvBundle(envFormId, input);
      else return;
      setEnvFormId(null);
    } catch {
      setActionError("The encrypted .env bundle could not be saved. No plaintext was sent.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <BackLink />
      <PageHeading eyebrow="PROJECT" title={project.name} description={project.description} actions={projectActions} />

      {editingProject && (
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
      )}

      {actionError && !editingProject && !envFormId && <p role="alert" className="text-xs text-rose-300">{actionError}</p>}

      <ConsolePanel title="WORKSPACE" status={`updated ${formatDate(project.updatedAt)}`} action={tabList}>
        {tab === "env" && (
          <div className="space-y-3">
            {envFormId && (
              <EnvBundleForm
                key={envFormId}
                projectId={project.id}
                bundle={envFormId === "new" ? undefined : envBundles.find((bundle) => bundle.id === envFormId)}
                isSaving={isSaving}
                requestError={actionError}
                onCancel={() => {
                  setEnvFormId(null);
                  setActionError(null);
                }}
                onSubmit={handleEnvSave}
              />
            )}
            {envBundles.length === 0 && !envFormId ? (
              <EmptyState message="no .env bundles for this project." />
            ) : (
              envBundles.map((bundle) => (
                <EnvBundleViewer
                  key={`${bundle.id}:${bundle.updatedAt}`}
                  bundle={bundle}
                  isDeleting={deletingId === bundle.id}
                  onEdit={() => {
                    setActionError(null);
                    setEnvFormId(bundle.id);
                  }}
                  onDelete={() => {
                    if (!window.confirm("Permanently delete this encrypted .env bundle? This cannot be undone.")) return;
                    setDeletingId(bundle.id);
                    setActionError(null);
                    void deleteEnvBundle(bundle.id)
                      .catch(() => setActionError("The encrypted .env bundle could not be deleted."))
                      .finally(() => setDeletingId(null));
                  }}
                />
              ))
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
                  <TaskCategoryBadge category={taskCategory(task.categoryId)} className="shrink-0" />
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
