"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FileCode2, Plus } from "lucide-react";
import { Modal } from "@/app/components/ui/modal";
import { formatDate } from "@/app/lib/format";
import { useUnlockedVault, useVaultSession } from "@/app/lib/vault-session";
import type { Project } from "@/app/lib/vault-data.types";
import type { EnvBundleInput } from "@/app/lib/workspace.types";
import { EnvBundleForm } from "./env-bundle-form";
import { EnvBundleViewer } from "./env-bundle-viewer";
import {
  PROJECT_WORKSPACE_PRIMARY_ACTION,
  ProjectWorkspaceShell,
  WorkspaceEmptyState,
  type ProjectWorkspaceTab,
} from "./project-workspace-shell";

interface ProjectEnvWorkspaceProps {
  project: Project;
  counts: Record<ProjectWorkspaceTab, number>;
  selectedBundleId: string | null;
  onTabChange: (tab: ProjectWorkspaceTab) => void;
  onSelectionChange: (id: string | null, replace?: boolean) => void;
}

export function ProjectEnvWorkspace({
  project,
  counts,
  selectedBundleId,
  onTabChange,
  onSelectionChange,
}: ProjectEnvWorkspaceProps) {
  const data = useUnlockedVault();
  const { createEnvBundle, deleteEnvBundle, updateEnvBundle } = useVaultSession();
  const [formId, setFormId] = useState<"new" | string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const bundles = useMemo(
    () => data.envBundles
      .filter((bundle) => bundle.projectId === project.id)
      .sort((a, b) => a.environment.localeCompare(b.environment)),
    [data.envBundles, project.id],
  );
  const selectedFromUrl = bundles.find((bundle) => bundle.id === selectedBundleId) ?? null;
  const selected = selectedFromUrl ?? (selectedBundleId ? null : bundles[0] ?? null);
  const formBundle = formId && formId !== "new"
    ? bundles.find((bundle) => bundle.id === formId)
    : undefined;

  useEffect(() => {
    if (selectedBundleId && !selectedFromUrl) onSelectionChange(null, true);
  }, [selectedBundleId, selectedFromUrl, onSelectionChange]);

  const handleSave = async (input: EnvBundleInput) => {
    setIsSaving(true);
    setActionError(null);
    try {
      const saved = formId === "new"
        ? await createEnvBundle(input)
        : formId
          ? await updateEnvBundle(formId, input)
          : null;
      if (!saved) return;
      setFormId(null);
      onSelectionChange(saved.id, formId !== "new");
    } catch {
      setActionError("The encrypted .env bundle could not be saved. No plaintext was sent.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected || !window.confirm("Permanently delete this encrypted .env bundle? This cannot be undone.")) return;

    const nextBundle = bundles.find((bundle) => bundle.id !== selected.id) ?? null;
    setDeletingId(selected.id);
    setActionError(null);
    try {
      await deleteEnvBundle(selected.id);
      onSelectionChange(nextBundle?.id ?? null, true);
    } catch {
      setActionError("The encrypted .env bundle could not be deleted.");
    } finally {
      setDeletingId(null);
    }
  };

  const action = (
    <button
      type="button"
      onClick={() => {
        setActionError(null);
        setFormId("new");
      }}
      className={PROJECT_WORKSPACE_PRIMARY_ACTION}
    >
      <Plus className="h-3.5 w-3.5" /> NEW .ENV BUNDLE
    </button>
  );

  return (
    <ProjectWorkspaceShell
      activeTab="env"
      counts={counts}
      status={`${bundles.length} ${bundles.length === 1 ? "BUNDLE" : "BUNDLES"}`}
      action={action}
      onTabChange={onTabChange}
    >
      <Modal
        isOpen={formId !== null}
        onClose={() => {
          setFormId(null);
          setActionError(null);
        }}
        title={formId === "new" ? "NEW .ENV BUNDLE" : "EDIT .ENV BUNDLE"}
        status="WHOLE FILE ENCRYPTION"
        description="Variable names, values, comments, and environment name are encrypted locally before saving."
        icon={<FileCode2 className="h-4 w-4" />}
        maxWidth="2xl"
        closeDisabled={isSaving}
      >
        {formId && (
          <EnvBundleForm
            key={formId}
            projectId={project.id}
            bundle={formBundle}
            isSaving={isSaving}
            requestError={actionError}
            onCancel={() => {
              setFormId(null);
              setActionError(null);
            }}
            onSubmit={handleSave}
          />
        )}
      </Modal>

      {bundles.length === 0 ? (
        <WorkspaceEmptyState
          message="no .env bundles for this project."
          hint="Add a complete synthetic environment file; names and values are encrypted together."
        />
      ) : (
        <div className="grid min-w-0 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="border-b border-accent/12 lg:border-r lg:border-b-0" aria-label="Environment bundles">
            <div className="border-b border-accent/10 px-4 py-2 text-[9px] tracking-widest text-subtle-foreground">
              ENVIRONMENT FILES
            </div>
            <ul className="divide-y divide-accent/10">
              {bundles.map((bundle) => {
                const active = bundle.id === selected?.id;
                return (
                  <li key={bundle.id}>
                    <button
                      type="button"
                      onClick={() => onSelectionChange(bundle.id)}
                      aria-current={active ? "true" : undefined}
                      className={`flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400/50 ${
                        active ? "bg-cyan-400/10" : "hover:bg-cyan-400/5"
                      }`}
                    >
                      <FileCode2 className={`h-4 w-4 shrink-0 ${active ? "text-cyan-700 dark:text-cyan-300" : "text-foreground/32"}`} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs text-foreground">.env.{bundle.environment}</span>
                        <span className="mt-0.5 block text-[10px] text-subtle-foreground">updated {formatDate(bundle.updatedAt)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="min-w-0">
            {selected && (
              <EnvBundleViewer
                key={`${selected.id}:${selected.updatedAt}`}
                bundle={selected}
                embedded
                isDeleting={deletingId === selected.id}
                onEdit={() => {
                  setActionError(null);
                  setFormId(selected.id);
                }}
                onDelete={() => void handleDelete()}
              />
            )}
            {actionError && !formId && <p role="alert" className="px-4 pb-4 text-xs text-rose-700 dark:text-rose-300 sm:px-5">{actionError}</p>}
          </div>
        </div>
      )}
    </ProjectWorkspaceShell>
  );
}
