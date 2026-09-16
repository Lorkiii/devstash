"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, KeyRound, Plus, Search } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Modal } from "@/app/components/ui/modal";
import { PageHeading } from "@/app/components/ui/page-heading";
import { TypeBadge } from "@/app/components/ui/type-badge";
import type { VaultItemType } from "@/app/lib/vault-data.types";
import { VAULT_TYPE_ORDER } from "@/app/lib/vault-types";
import { useUnlockedVault, useVaultSession } from "@/app/lib/vault-session";
import type { GenericSecretInput } from "@/app/lib/vault-item.types";
import { formatDate } from "@/app/lib/format";
import { GenericSecretForm } from "./generic-secret-form";
import { VaultTypeFilter } from "./vault-type-filter";
import { VaultItemDetail } from "./vault-item-detail";

// Only the record ID travels in the URL (?item=). Titles and values stay in
// memory; the query box filters the already-decrypted list locally.
export function VaultBrowser() {
  const data = useUnlockedVault();
  const {
    createGenericSecret,
    deleteVaultItem,
    touchRecent,
    updateGenericSecret,
  } = useVaultSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedId = searchParams.get("item");
  const createRequested = searchParams.get("create") === "1";
  const [typeFilter, setTypeFilter] = useState<VaultItemType | "ALL">("ALL");
  const [query, setQuery] = useState<string>("");
  const [formItemId, setFormItemId] = useState<"new" | string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const initial = Object.fromEntries(VAULT_TYPE_ORDER.map((type) => [type, 0])) as Record<VaultItemType, number>;
    data.secrets.forEach((item) => {
      initial[item.type] += 1;
    });
    return initial;
  }, [data.secrets]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.secrets
      .filter((item) => typeFilter === "ALL" || item.type === typeFilter)
      .filter(
        (item) =>
          !needle ||
          item.title.toLowerCase().includes(needle) ||
          item.tags.some((tag) => tag.toLowerCase().includes(needle))
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [data.secrets, typeFilter, query]);

  const selected = data.secrets.find((item) => item.id === selectedId) ?? null;
  const activeFormItemId = formItemId ?? (createRequested ? "new" : null);
  const detailOpen = selected !== null && activeFormItemId === null;
  const projectName = (projectId?: string) =>
    data.projects.find((project) => project.id === projectId)?.name;

  useEffect(() => {
    if (selected) touchRecent("secret", selected.id);
  }, [selected, touchRecent]);

  const select = (id: string | null) => {
    setFormItemId(null);
    setActionError(null);
    router.replace(id ? `/vault?item=${id}` : "/vault");
  };

  const handleSave = async (input: GenericSecretInput) => {
    setIsSaving(true);
    setActionError(null);
    try {
      const saved = activeFormItemId === "new"
        ? await createGenericSecret(input)
        : await updateGenericSecret(activeFormItemId as string, input);
      select(saved.id);
    } catch {
      setActionError("The encrypted secret could not be saved. No plaintext was sent.");
    } finally {
      setIsSaving(false);
    }
  };

  const closeForm = () => {
    setFormItemId(null);
    setActionError(null);
    if (createRequested) router.replace("/vault");
  };

  const handleDelete = async () => {
    if (!selected || !window.confirm("Permanently delete this encrypted secret? This cannot be undone.")) {
      return;
    }
    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteVaultItem(selected.id);
      select(null);
    } catch {
      setActionError("The encrypted secret could not be deleted.");
    } finally {
      setIsDeleting(false);
    }
  };

  const newButton = (
    <button
      type="button"
      onClick={() => {
        router.replace("/vault");
        setActionError(null);
        setFormItemId("new");
      }}
      className="inline-flex min-h-10 items-center gap-1.5 rounded border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-xs tracking-wider text-foreground hover:bg-accent/20"
    >
      <Plus className="w-3.5 h-3.5" /> NEW GENERIC SECRET
    </button>
  );

  return (
    <div className="space-y-4">
      <PageHeading
        eyebrow="VAULT"
        title="Secrets & credentials"
        description="Generic secrets are encrypted and decrypted in this tab. Additional credential types arrive in later bounded work."
        actions={newButton}
      />

      <Modal
        isOpen={activeFormItemId !== null}
        onClose={closeForm}
        title={activeFormItemId === "new" ? "NEW GENERIC SECRET" : "EDIT GENERIC SECRET"}
        status="ENCRYPTS IN THIS TAB"
        description="The complete form is encrypted locally as one payload. The optional project link is authenticated relationship metadata."
        icon={<KeyRound className="h-4 w-4" />}
        maxWidth="2xl"
        closeDisabled={isSaving}
      >
        {activeFormItemId && (
          <GenericSecretForm
            key={activeFormItemId}
            item={activeFormItemId === "new" ? undefined : selected ?? undefined}
            projects={data.projects}
            isSaving={isSaving}
            requestError={actionError}
            onCancel={closeForm}
            onSubmit={handleSave}
          />
        )}
      </Modal>

      <Modal
        isOpen={detailOpen}
        onClose={() => select(null)}
        title="VAULT RECORD"
        status="LOCAL INSPECTION"
        description="Sensitive fields remain masked until you explicitly reveal or copy them."
        icon={<KeyRound className="h-4 w-4" />}
        maxWidth="3xl"
        bodyClassName="p-0"
        closeDisabled={isDeleting}
      >
        {selected && (
          <VaultItemDetail
            key={`${selected.id}:${selected.updatedAt}`}
            item={selected}
            projectName={projectName(selected.projectId)}
            embedded
            isDeleting={isDeleting}
            actionError={actionError}
            onBack={() => select(null)}
            onEdit={() => {
              setActionError(null);
              setFormItemId(selected.id);
            }}
            onDelete={() => void handleDelete()}
          />
        )}
      </Modal>

      <ConsolePanel title="RECORDS" status={`${visible.length} SHOWN`} bodyClassName="p-0">
        <div className="grid gap-2.5 border-b border-accent/10 p-3 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)] lg:items-start">
          <label className="flex min-h-10 items-center gap-2 rounded border border-accent/20 bg-surface-muted/80 px-2.5 py-1.5 focus-within:border-accent/45 focus-within:ring-2 focus-within:ring-accent/10">
            <Search className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="filter by title or #tag"
              aria-label="Filter records"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-xs text-foreground placeholder:text-subtle-foreground focus:outline-none"
            />
          </label>
          <VaultTypeFilter selected={typeFilter} counts={counts} onChange={setTypeFilter} />
        </div>

        {visible.length === 0 ? (
          <div className="p-3">
            <EmptyState
              message={data.secrets.length === 0 ? "no encrypted secrets yet." : "no records match."}
              hint={data.secrets.length === 0 ? "Create a generic secret to begin." : "Clear the filter or search a different tag."}
            />
          </div>
        ) : (
          <ul className="divide-y divide-accent/10">
            {visible.map((item) => {
              const active = item.id === selectedId;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => select(item.id)}
                    aria-current={active ? "true" : undefined}
                    aria-haspopup="dialog"
                    className={`group grid min-h-16 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/55 sm:px-4 ${
                      active ? "bg-accent/10" : "hover:bg-accent/5"
                    }`}
                  >
                    <TypeBadge type={item.type} className="w-[68px] shrink-0 justify-center" />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-foreground">{item.title}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-subtle-foreground">
                        {projectName(item.projectId) ?? "no project"}
                        {item.tags.length > 0 && ` · ${item.tags.map((tag) => `#${tag}`).join(" ")}`}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-subtle-foreground transition-colors group-hover:text-accent">
                      <span className="hidden text-right sm:block">
                        <span className="block text-[8px] tracking-[0.16em]">UPDATED</span>
                        <span className="mt-0.5 block text-[10px] text-subtle-foreground">{formatDate(item.updatedAt)}</span>
                      </span>
                      <span className="grid h-8 w-8 place-items-center rounded border border-accent/15 bg-background/40 transition-colors group-hover:border-accent/35 group-hover:bg-accent/10">
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ConsolePanel>
    </div>
  );
}
