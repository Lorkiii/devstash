"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { EmptyState } from "@/app/components/ui/empty-state";
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
      const saved = formItemId === "new"
        ? await createGenericSecret(input)
        : await updateGenericSecret(formItemId as string, input);
      select(saved.id);
    } catch {
      setActionError("The encrypted secret could not be saved. No plaintext was sent.");
    } finally {
      setIsSaving(false);
    }
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
      className="inline-flex items-center gap-1.5 rounded border border-[#6ea8ff]/40 bg-[#6ea8ff]/10 px-3 py-1.5 font-mono text-xs tracking-wider text-[#e8eefb] hover:bg-[#6ea8ff]/20"
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className={`lg:col-span-5 ${selected || formItemId ? "hidden lg:block" : ""}`}>
          <ConsolePanel title="RECORDS" status={`${visible.length} SHOWN`} className="h-full" bodyClassName="p-0">
            <div className="p-3 space-y-2.5 border-b border-[#6ea8ff]/10">
              <label className="flex items-center gap-2 rounded border border-[#6ea8ff]/20 bg-[#070d18]/80 px-2.5 py-1.5">
                <Search className="w-3.5 h-3.5 text-[#6ea8ff]/70" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="filter by title or #tag"
                  aria-label="Filter records"
                  autoComplete="off"
                  spellCheck={false}
                  className="flex-1 bg-transparent text-xs text-[#e8eefb] placeholder:text-[#e8eefb]/30 focus:outline-none"
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
              <ul className="divide-y divide-[#6ea8ff]/10">
                {visible.map((item) => {
                  const active = item.id === selectedId;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => select(item.id)}
                        aria-current={active ? "true" : undefined}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                          active ? "bg-[#6ea8ff]/10" : "hover:bg-[#6ea8ff]/5"
                        }`}
                      >
                        <TypeBadge type={item.type} className="w-[68px] justify-center shrink-0" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs text-[#e8eefb] truncate">{item.title}</span>
                          <span className="block text-[10px] text-[#e8eefb]/45 truncate">
                            {projectName(item.projectId) ?? "no project"}
                            {item.tags.length > 0 && ` · ${item.tags.map((tag) => `#${tag}`).join(" ")}`}
                          </span>
                        </span>
                        <span className="text-[10px] text-[#e8eefb]/40 shrink-0">{formatDate(item.updatedAt)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ConsolePanel>
        </div>

        <div className={`lg:col-span-7 ${selected || formItemId ? "" : "hidden lg:block"}`}>
          {formItemId ? (
            <GenericSecretForm
              key={formItemId}
              item={formItemId === "new" ? undefined : selected ?? undefined}
              projects={data.projects}
              isSaving={isSaving}
              requestError={actionError}
              onCancel={() => {
                setFormItemId(null);
                setActionError(null);
              }}
              onSubmit={handleSave}
            />
          ) : selected ? (
            <VaultItemDetail
              key={`${selected.id}:${selected.updatedAt}`}
              item={selected}
              projectName={projectName(selected.projectId)}
              isDeleting={isDeleting}
              actionError={actionError}
              onBack={() => select(null)}
              onEdit={() => {
                setActionError(null);
                setFormItemId(selected.id);
              }}
              onDelete={() => void handleDelete()}
            />
          ) : (
            <ConsolePanel title="DETAIL" tone="muted" className="h-full">
              <EmptyState
                message="select a record to inspect it."
                hint="Secret fields stay masked until you reveal them; reveal auto-hides."
              />
            </ConsolePanel>
          )}
        </div>
      </div>
    </div>
  );
}
