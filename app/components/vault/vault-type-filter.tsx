"use client";

import React from "react";
import type { VaultItemType } from "@/app/lib/vault-data.types";
import { VAULT_TYPE_META, VAULT_TYPE_ORDER } from "@/app/lib/vault-types";

interface VaultTypeFilterProps {
  selected: VaultItemType | "ALL";
  counts: Record<VaultItemType, number>;
  onChange: (next: VaultItemType | "ALL") => void;
}

export function VaultTypeFilter({ selected, counts, onChange }: VaultTypeFilterProps) {
  const total = VAULT_TYPE_ORDER.reduce((sum, type) => sum + counts[type], 0);

  const chip = (label: string, value: VaultItemType | "ALL", count: number, activeClass: string) => {
    const active = selected === value;
    return (
      <button
        key={value}
        type="button"
        onClick={() => onChange(value)}
        aria-pressed={active}
        className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[10px] tracking-widest transition-colors cursor-pointer ${
          active ? activeClass : "border-accent/15 text-muted-foreground hover:text-foreground hover:border-accent/40"
        }`}
      >
        <span>{label}</span>
        <span className={active ? "opacity-80" : "opacity-50"}>{count}</span>
      </button>
    );
  };

  return (
    <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-1.5">
      {chip("ALL", "ALL", total, "bg-accent/15 border-accent/50 text-foreground")}
      {VAULT_TYPE_ORDER.map((type) =>
        chip(VAULT_TYPE_META[type].short, type, counts[type], VAULT_TYPE_META[type].chipClass)
      )}
    </div>
  );
}
