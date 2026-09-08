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
import { formatDate } from "@/app/lib/format";
import { VaultTypeFilter } from "./vault-type-filter";
import { VaultItemDetail } from "./vault-item-detail";

// Only the record ID travels in the URL (?item=). Titles and values stay in
// memory; the query box filters the already-decrypted list locally.
export function VaultBrowser() {
  const data = useUnlockedVault();
  const { touchRecent } = useVaultSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedId = searchParams.get("item");
  const [typeFilter, setTypeFilter] = useState<VaultItemType | "ALL">("ALL");
  const [query, setQuery] = useState<string>("");

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
    router.replace(id ? `/vault?item=${id}` : "/vault");
  };

  const newButton = (
    <button
      type="button"
      disabled
      title="Creation arrives with the ciphertext API phase"
      className="inline-flex items-center gap-1.5 rounded border border-[#6ea8ff]/30 bg-[#0a1220]/70 px-3 py-1.5 font-mono text-xs tracking-wider text-[#e8eefb]/60 disabled:cursor-not-allowed"
    >
      <Plus className="w-3.5 h-3.5" /> NEW SECRET
    </button>
  );

  return (
    <div className="space-y-4">
      <PageHeading
        eyebrow="VAULT"
        title="Secrets & credentials"
        description="Logins, API keys, database and SSH credentials, recovery codes, generic secrets. Masked by default."
        actions={newButton}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className={`lg:col-span-5 ${selected ? "hidden lg:block" : ""}`}>
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
                <EmptyState message="no records match." hint="Clear the filter or search a different tag." />
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

        <div className={`lg:col-span-7 ${selected ? "" : "hidden lg:block"}`}>
          {selected ? (
            <VaultItemDetail
              item={selected}
              projectName={projectName(selected.projectId)}
              onBack={() => select(null)}
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
