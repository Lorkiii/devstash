"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FileCode2, LoaderCircle, Plus, Upload } from "lucide-react";
import { Modal } from "@/app/components/ui/modal";
import { formatDate } from "@/app/lib/format";
import { useUnlockedVault, useVaultSession } from "@/app/lib/vault-session";
import type { Project } from "@/app/lib/vault-data.types";
import {
  WorkspaceFileImportError,
  clearEnvImportDraft,
  readEnvImportFile,
  type EnvImportDraft,
} from "@/app/lib/workspace-file-import";
import type { EnvBundleInput } from "@/app/lib/workspace.types";
import { EnvBundleForm } from "./env-bundle-form";
import { EnvBundleImportForm } from "./env-bundle-import-form";
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

type EnvModalState =
  | { mode: "manual" }
  | { mode: "edit"; bundleId: string }
  | { mode: "import"; draft: EnvImportDraft }
  | null;

export function ProjectEnvWorkspace({
  project,
  counts,
  selectedBundleId,
  onTabChange,
  onSelectionChange,
}: ProjectEnvWorkspaceProps) {
  const data = useUnlockedVault();
  const { createEnvBundle, deleteEnvBundle, updateEnvBundle } = useVaultSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importActionRef = useRef<HTMLButtonElement>(null);
  const importDraftRef = useRef<EnvImportDraft | null>(null);
  const mountedRef = useRef(true);
  const [modalState, setModalState] = useState<EnvModalState>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const replaceModalState = (nextState: EnvModalState) => {
    const nextDraft = nextState?.mode === "import" ? nextState.draft : null;
    if (importDraftRef.current !== nextDraft) clearEnvImportDraft(importDraftRef.current);
    importDraftRef.current = nextDraft;
    setModalState(nextState);
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearEnvImportDraft(importDraftRef.current);
      importDraftRef.current = null;
    };
  }, []);

  const bundles = useMemo(
    () => data.envBundles
      .filter((bundle) => bundle.projectId === project.id)
      .sort((a, b) => a.environment.localeCompare(b.environment)),
    [data.envBundles, project.id],
  );
  const selectedFromUrl = bundles.find((bundle) => bundle.id === selectedBundleId) ?? null;
  const selected = selectedFromUrl ?? (selectedBundleId ? null : bundles[0] ?? null);
  const formBundle = modalState?.mode === "edit"
    ? bundles.find((bundle) => bundle.id === modalState.bundleId)
    : undefined;

  useEffect(() => {
    if (selectedBundleId && !selectedFromUrl) onSelectionChange(null, true);
  }, [selectedBundleId, selectedFromUrl, onSelectionChange]);

  const handleSave = async (input: EnvBundleInput) => {
    setIsSaving(true);
    setActionError(null);
    try {
      const editing = modalState?.mode === "edit";
      const saved = editing
        ? await updateEnvBundle(modalState.bundleId, input)
        : modalState
          ? await createEnvBundle(input)
          : null;
      if (!saved) return;
      replaceModalState(null);
      onSelectionChange(saved.id, editing);
    } catch {
      setActionError("The encrypted .env bundle could not be saved. No plaintext was sent.");
    } finally {
      setIsSaving(false);
    }
  };

  const closeForm = () => {
    replaceModalState(null);
    setActionError(null);
    setImportError(null);
  };

  const handleImportSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.item(0) ?? null;
    event.currentTarget.value = "";
    if (!file) return;

    setIsImporting(true);
    setImportError(null);
    try {
      const draft = await readEnvImportFile(file);
      if (!mountedRef.current) {
        clearEnvImportDraft(draft);
        return;
      }
      setActionError(null);
      replaceModalState({ mode: "import", draft });
    } catch (error) {
      if (!mountedRef.current) return;
      setImportError(
        error instanceof WorkspaceFileImportError
          ? error.message
          : "The selected .env file could not be imported.",
      );
    } finally {
      if (mountedRef.current) setIsImporting(false);
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
    <>
      <input
        ref={fileInputRef}
        type="file"
        tabIndex={-1}
        aria-hidden="true"
        disabled={isImporting}
        onChange={(event) => void handleImportSelection(event)}
        className="hidden"
      />
      <button
        ref={importActionRef}
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        aria-busy={isImporting}
        className={`${PROJECT_WORKSPACE_PRIMARY_ACTION} disabled:cursor-wait disabled:opacity-60`}
      >
        {isImporting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {isImporting ? "READING .ENV" : "IMPORT .ENV"}
      </button>
      <button
        type="button"
        onClick={() => {
          setImportError(null);
          setActionError(null);
          replaceModalState({ mode: "manual" });
        }}
        disabled={isImporting}
        className={`${PROJECT_WORKSPACE_PRIMARY_ACTION} disabled:cursor-wait disabled:opacity-60`}
      >
        <Plus className="h-3.5 w-3.5" /> NEW .ENV BUNDLE
      </button>
    </>
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
        isOpen={modalState !== null}
        onClose={closeForm}
        title={modalState?.mode === "import" ? "REVIEW IMPORTED .ENV" : modalState?.mode === "manual" ? "NEW .ENV BUNDLE" : "EDIT .ENV BUNDLE"}
        status={modalState?.mode === "import" ? "LOCAL REVIEW" : "WHOLE FILE ENCRYPTION"}
        description={modalState?.mode === "import"
          ? "Review each variable locally. Nothing is encrypted or saved until you choose Create encrypted bundle."
          : "Variable names, values, comments, and environment name are encrypted locally before saving."}
        icon={<FileCode2 className="h-4 w-4" />}
        maxWidth={modalState?.mode === "import" ? "3xl" : "2xl"}
        bodyClassName={modalState?.mode === "import" ? "!overflow-hidden flex flex-col p-0" : undefined}
        closeDisabled={isSaving}
        fallbackFocusRef={importActionRef}
      >
        {modalState?.mode === "import" ? (
          <EnvBundleImportForm
            key="import-review"
            projectId={project.id}
            draft={modalState.draft}
            isSaving={isSaving}
            requestError={actionError}
            onCancel={closeForm}
            onSubmit={handleSave}
          />
        ) : modalState ? (
          <EnvBundleForm
            key={modalState.mode === "edit" ? modalState.bundleId : "manual"}
            projectId={project.id}
            bundle={formBundle}
            isSaving={isSaving}
            requestError={actionError}
            onCancel={closeForm}
            onSubmit={handleSave}
          />
        ) : null}
      </Modal>

      {importError && (
        <p role="alert" className="border-t border-rose-400/15 bg-rose-400/[0.04] px-3 py-2 font-sans text-[11px] text-rose-700 dark:text-rose-300 sm:px-5 sm:text-xs">
          {importError}
        </p>
      )}

      {bundles.length === 0 ? (
        <WorkspaceEmptyState
          message="no .env bundles for this project."
          hint="Add a complete synthetic environment file; names and values are encrypted together."
        />
      ) : (
        <div className="grid min-w-0 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="border-b border-accent/12 lg:border-r lg:border-b-0" aria-label="Environment bundles">
            <div className="border-b border-accent/10 px-2.5 py-1.5 text-[8px] tracking-widest text-subtle-foreground sm:px-4 sm:py-2 sm:text-[9px]">
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
                      className={`flex min-h-11 w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400/50 sm:min-h-14 sm:gap-3 sm:px-4 sm:py-2.5 ${
                        active ? "bg-cyan-400/10" : "hover:bg-cyan-400/5"
                      }`}
                    >
                      <FileCode2 className={`h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4 ${active ? "text-cyan-700 dark:text-cyan-300" : "text-foreground/32"}`} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] text-foreground sm:text-xs">.env.{bundle.environment}</span>
                        <span className="mt-0.5 block text-[9px] text-subtle-foreground sm:text-[10px]">updated {formatDate(bundle.updatedAt)}</span>
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
                  setImportError(null);
                  setActionError(null);
                  replaceModalState({ mode: "edit", bundleId: selected.id });
                }}
                onDelete={() => void handleDelete()}
              />
            )}
            {actionError && !modalState && <p role="alert" className="px-3 pb-3 text-xs text-rose-700 dark:text-rose-300 sm:px-5 sm:pb-4">{actionError}</p>}
          </div>
        </div>
      )}
    </ProjectWorkspaceShell>
  );
}
