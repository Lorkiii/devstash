"use client";

import React, { useEffect, useMemo, useState } from "react";
import { KeyRound, Plus, Search } from "lucide-react";
import { Modal } from "@/app/components/ui/modal";
import { TypeBadge } from "@/app/components/ui/type-badge";
import { GenericSecretForm } from "@/app/components/vault/generic-secret-form";
import { VaultItemDetail } from "@/app/components/vault/vault-item-detail";
import { formatDate } from "@/app/lib/format";
import type { GenericSecretInput } from "@/app/lib/vault-item.types";
import type { Project } from "@/app/lib/vault-data.types";
import { useUnlockedVault, useVaultSession } from "@/app/lib/vault-session";
import {
  PROJECT_WORKSPACE_PRIMARY_ACTION,
  ProjectWorkspaceShell,
  WorkspaceEmptyState,
  type ProjectWorkspaceTab,
} from "./project-workspace-shell";

interface ProjectSecretsWorkspaceProps {
  project: Project;
  counts: Record<ProjectWorkspaceTab, number>;
  selectedItemId: string | null;
  onTabChange: (tab: ProjectWorkspaceTab) => void;
  onSelectionChange: (id: string | null, replace?: boolean) => void;
}

export function ProjectSecretsWorkspace({
  project,
  counts,
  selectedItemId,
  onTabChange,
  onSelectionChange,
}: ProjectSecretsWorkspaceProps) {
  const data = useUnlockedVault();
  const { createGenericSecret, deleteVaultItem, touchRecent, updateGenericSecret } = useVaultSession();
  const [query, setQuery] = useState("");
  const [formItemId, setFormItemId] = useState<"new" | string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const items = useMemo(
    () => data.secrets
      .filter((item) => item.projectId === project.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [data.secrets, project.id],
  );
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) =>
      !needle ||
      item.title.toLowerCase().includes(needle) ||
      item.tags.some((tag) => tag.toLowerCase().includes(needle)),
    );
  }, [items, query]);
  const selected = items.find((item) => item.id === selectedItemId) ?? null;
  const formItem = formItemId && formItemId !== "new"
    ? items.find((item) => item.id === formItemId)
    : undefined;

  useEffect(() => {
    if (selectedItemId && !selected) onSelectionChange(null, true);
  }, [selectedItemId, selected, onSelectionChange]);

  useEffect(() => {
    if (selected) touchRecent("secret", selected.id);
  }, [selected, touchRecent]);

  const handleSave = async (input: GenericSecretInput) => {
    setIsSaving(true);
    setActionError(null);
    try {
      const saved = formItemId === "new"
        ? await createGenericSecret(input)
        : formItemId
          ? await updateGenericSecret(formItemId, input)
          : null;
      if (!saved) return;
      setFormItemId(null);
      onSelectionChange(saved.id, formItemId !== "new");
    } catch {
      setActionError("The encrypted secret could not be saved. No plaintext was sent.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected || !window.confirm("Permanently delete this encrypted secret? This cannot be undone.")) return;

    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteVaultItem(selected.id);
      onSelectionChange(null, true);
    } catch {
      setActionError("The encrypted secret could not be deleted.");
    } finally {
      setIsDeleting(false);
    }
  };

  const action = (
    <button
      type="button"
      onClick={() => {
        setActionError(null);
        setFormItemId("new");
      }}
      className={PROJECT_WORKSPACE_PRIMARY_ACTION}
    >
      <Plus className="h-3.5 w-3.5" /> NEW GENERIC SECRET
    </button>
  );

  return (
    <ProjectWorkspaceShell
      activeTab="secrets"
      counts={counts}
      status={`${items.length} ${items.length === 1 ? "SECRET" : "SECRETS"}`}
      action={action}
      onTabChange={onTabChange}
    >
      <Modal
        isOpen={formItemId !== null}
        onClose={() => {
          setFormItemId(null);
          setActionError(null);
        }}
        title={formItemId === "new" ? "NEW GENERIC SECRET" : "EDIT GENERIC SECRET"}
        status="ENCRYPTS IN THIS TAB"
        description="This secret stays linked to the current project and is encrypted locally before saving."
        icon={<KeyRound className="h-4 w-4" />}
        maxWidth="2xl"
        closeDisabled={isSaving}
      >
        {formItemId && (
          <GenericSecretForm
            key={formItemId}
            item={formItem}
            projects={data.projects}
            fixedProject={project}
            isSaving={isSaving}
            requestError={actionError}
            onCancel={() => {
              setFormItemId(null);
              setActionError(null);
            }}
            onSubmit={handleSave}
          />
        )}
      </Modal>

      {items.length === 0 ? (
        <WorkspaceEmptyState
          message="no secrets linked to this project."
          hint="Create a generic secret here to keep it fixed to this project workspace."
        />
      ) : (
        <div className="grid min-w-0 lg:grid-cols-[minmax(16rem,0.82fr)_minmax(0,1.18fr)]">
          <div className={`${selected ? "hidden lg:block" : ""} min-w-0 border-accent/12 lg:border-r`}>
            <label className="flex min-h-12 items-center gap-2 border-b border-accent/10 px-4 py-2.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-violet-700/80 dark:text-violet-300/70" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="filter by title or #tag"
                aria-label="Filter project secrets"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent text-xs text-foreground placeholder:text-subtle-foreground focus:outline-none"
              />
              <span className="text-[9px] tracking-wider text-foreground/32">{visible.length} SHOWN</span>
            </label>

            {visible.length === 0 ? (
              <WorkspaceEmptyState message="no secrets match this filter." className="py-9" />
            ) : (
              <ul className="divide-y divide-accent/10">
                {visible.map((item) => {
                  const active = item.id === selectedItemId;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onSelectionChange(item.id)}
                        aria-current={active ? "true" : undefined}
                        className={`flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400/50 ${
                          active ? "bg-violet-400/10" : "hover:bg-violet-400/5"
                        }`}
                      >
                        <TypeBadge type={item.type} className="w-[68px] shrink-0 justify-center" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs text-foreground">{item.title}</span>
                          <span className="mt-0.5 block truncate text-[10px] text-subtle-foreground">
                            {item.tags.length > 0 ? item.tags.map((tag) => `#${tag}`).join(" ") : `updated ${formatDate(item.updatedAt)}`}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className={`${selected ? "" : "hidden lg:block"} min-w-0`}>
            {selected ? (
              <VaultItemDetail
                key={`${selected.id}:${selected.updatedAt}`}
                item={selected}
                projectName={project.name}
                embedded
                isDeleting={isDeleting}
                actionError={actionError}
                onBack={() => onSelectionChange(null)}
                onEdit={() => {
                  setActionError(null);
                  setFormItemId(selected.id);
                }}
                onDelete={() => void handleDelete()}
              />
            ) : (
              <WorkspaceEmptyState
                message="select a secret to inspect it."
                hint="Sensitive fields remain masked until an explicit timed reveal."
              />
            )}
          </div>
        </div>
      )}
    </ProjectWorkspaceShell>
  );
}
