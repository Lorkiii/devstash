"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, ListFilter } from "lucide-react";
import type { VaultItemType } from "@/app/lib/vault-data.types";
import { VAULT_TYPE_META, VAULT_TYPE_ORDER } from "@/app/lib/vault-types";

interface VaultTypeFilterProps {
  selected: VaultItemType | "ALL";
  counts: Record<VaultItemType, number>;
  onChange: (next: VaultItemType | "ALL") => void;
}

export function VaultTypeFilter({ selected, counts, onChange }: VaultTypeFilterProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const total = VAULT_TYPE_ORDER.reduce((sum, type) => sum + counts[type], 0);
  const availableTypes = VAULT_TYPE_ORDER.filter((type) => counts[type] > 0);
  const label = selected === "ALL" ? "All records" : VAULT_TYPE_META[selected].label;
  const count = selected === "ALL" ? total : counts[selected];

  useEffect(() => {
    if (!open) return;
    containerRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();

    const dismissOnPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setOpen(false);
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", dismissOnPointer);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOnPointer);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [open]);

  const choose = (type: VaultItemType | "ALL") => {
    onChange(type);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      className="relative min-w-0 sm:w-56 sm:shrink-0"
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={total === 0}
        aria-label={`Filter records by type: ${label}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-accent/25 bg-surface-muted/85 px-3 text-left text-xs text-foreground transition-colors hover:border-accent/55 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/55 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ListFilter className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
        <span className="rounded border border-accent/20 bg-background/60 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-subtle-foreground">{count}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-subtle-foreground transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          role="group"
          aria-label="Record types"
          className="absolute right-0 top-[calc(100%+0.375rem)] z-30 w-full min-w-56 rounded-xl border border-accent/30 bg-surface p-1.5 shadow-[0_14px_36px_rgba(0,0,0,0.24)]"
        >
          <button
            type="button"
            aria-pressed={selected === "ALL"}
            onClick={() => choose("ALL")}
            className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/55 ${selected === "ALL" ? "bg-accent/15 text-foreground" : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"}`}
          >
            <span className="min-w-0 flex-1">All records</span>
            <span className="font-mono text-[10px] tabular-nums text-subtle-foreground">{total}</span>
            <Check className={`h-3.5 w-3.5 ${selected === "ALL" ? "text-accent" : "invisible"}`} aria-hidden="true" />
          </button>
          {availableTypes.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={selected === type}
              onClick={() => choose(type)}
              className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/55 ${selected === type ? "bg-accent/15 text-foreground" : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"}`}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full bg-current ${VAULT_TYPE_META[type].textClass}`} aria-hidden="true" />
              <span className="min-w-0 flex-1">{VAULT_TYPE_META[type].label}</span>
              <span className="font-mono text-[10px] tabular-nums text-subtle-foreground">{counts[type]}</span>
              <Check className={`h-3.5 w-3.5 ${selected === type ? "text-accent" : "invisible"}`} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
