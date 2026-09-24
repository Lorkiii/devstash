import React from "react";
import type { VaultItemType } from "@/app/lib/vault-data.types";
import { VAULT_TYPE_META } from "@/app/lib/vault-types";

interface TypeBadgeProps {
  type: VaultItemType;
  className?: string;
}

export function TypeBadge({ type, className = "" }: TypeBadgeProps) {
  const meta = VAULT_TYPE_META[type];
  return (
    <span
      className={`inline-flex items-center rounded border px-1 py-0.5 font-mono text-[9px] tracking-widest sm:px-1.5 sm:text-[10px] ${meta.chipClass} ${className}`}
    >
      {meta.short}
    </span>
  );
}
