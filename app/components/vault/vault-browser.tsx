"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const listRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => {
    const initial = Object.fromEntries(VAULT_TYPE_ORDER.map((type) => [type, 0])) as Record<VaultItemType, number>;
    data.secrets.forEach((item) => {
      initial[item.type] += 1;
    });
    return initial;
  }, [data.secrets]);
  const activeTypeFilter = typeFilter === "ALL" || counts[typeFilter] > 0 ? typeFilter : "ALL";

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.secrets
      .filter((item) => activeTypeFilter === "ALL" || item.type === activeTypeFilter)
      .filter(
        (item) =>
          !needle ||
          item.title.toLowerCase().includes(needle) ||
          item.tags.some((tag) => tag.toLowerCase().includes(needle))
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [data.secrets, activeTypeFilter, query]);

  const selected = data.secrets.find((item) => item.id === selectedId) ?? null;
  const activeFormItemId = formItemId ?? (createRequested ? "new" : null);
  const projectName = (projectId?: string) =>
    data.projects.find((project) => project.id === projectId)?.name;

  useEffect(() => {
    if (selected) touchRecent("secret", selected.id);
  }, [selected, touchRecent]);

  useEffect(() => {
    if (selectedId && !selected) router.replace("/vault", { scroll: false });
  }, [selectedId, selected, router]);

  const select = (id: string | null, replace = false) => {
    setFormItemId(null);
    setActionError(null);
    const href = id ? `/vault?item=${id}` : "/vault";
    if (replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  };

  const handleSave = async (input: GenericSecretInput) => {
    setIsSaving(true);
    setActionError(null);
    try {
      const saved = activeFormItemId === "new"
        ? await createGenericSecret(input)
        : await updateGenericSecret(activeFormItemId as string, input);
      select(saved.id, true);
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
      if (typeFilter === selected.type && counts[selected.type] === 1) setTypeFilter("ALL");
      select(null, true);
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
      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded border border-accent/40 bg-accent/10 px-2.5 py-1.5 font-mono text-[11px] tracking-wider text-foreground hover:bg-accent/20 sm:px-3 sm:text-xs"
    >
      <Plus className="w-3.5 h-3.5" /> NEW GENERIC SECRET
    </button>
  );

  return (
    <div className="space-y-3 sm:space-y-4">
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
        fallbackFocusRef={listRef}
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-accent/25 bg-surface-muted/85 px-3 focus-within:border-accent/55 focus-within:ring-2 focus-within:ring-accent/15">
          <Search className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by title or #tag"
            aria-label="Filter records"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-xs text-foreground placeholder:text-subtle-foreground focus:outline-none"
          />
        </label>
        <VaultTypeFilter selected={activeTypeFilter} counts={counts} onChange={setTypeFilter} />
      </div>
      {(query || activeTypeFilter !== "ALL") && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setTypeFilter("ALL");
          }}
          className="font-mono text-[11px] text-accent-strong underline underline-offset-4 hover:text-foreground"
        >
          Clear filters
        </button>
      )}

      <div ref={listRef} tabIndex={-1} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
        <ConsolePanel title="RECORDS" status={`${visible.length} SHOWN`} bodyClassName="p-0">
          {visible.length === 0 ? (
            <div className="p-2.5 sm:p-3">
              <EmptyState
                message={data.secrets.length === 0 ? "No encrypted secrets yet." : "No records match."}
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
                      className={`group grid min-h-14 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 px-2.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/55 sm:min-h-16 sm:gap-3 sm:px-4 sm:py-3 ${active ? "bg-accent/10" : "hover:bg-accent/5"}`}
                    >
                      <TypeBadge type={item.type} className="w-[54px] shrink-0 justify-center sm:w-[68px]" />
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-medium text-foreground sm:text-xs">{item.title}</span>
                        <span className="mt-0.5 block truncate text-[9px] text-subtle-foreground sm:text-[10px]">
                          {projectName(item.projectId) ?? "no project"}
                          {item.tags.length > 0 && ` · ${item.tags.map((tag) => `#${tag}`).join(" ")}`}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-subtle-foreground transition-colors group-hover:text-accent">
                        <span className="hidden text-right sm:block">
                          <span className="block text-[8px] tracking-[0.16em]">UPDATED</span>
                          <span className="mt-0.5 block text-[10px] text-subtle-foreground">{formatDate(item.updatedAt)}</span>
                        </span>
                        <span className="grid h-7 w-7 place-items-center rounded border border-accent/15 bg-background/40 transition-colors group-hover:border-accent/35 group-hover:bg-accent/10 sm:h-8 sm:w-8">
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
      {selected && activeFormItemId === null && (
        <VaultItemDetail
          key={`${selected.id}:${selected.updatedAt}`}
          item={selected}
          projectName={projectName(selected.projectId)}
          isDeleting={isDeleting}
          actionError={actionError}
          fallbackFocusRef={listRef}
          onClose={() => select(null, true)}
          onEdit={() => {
            setActionError(null);
            setFormItemId(selected.id);
          }}
          onDelete={() => void handleDelete()}
        />
      )}
    </div>
  );
}
