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
      className={`inline-flex items-center px-1.5 py-0.5 rounded border font-mono text-[10px] tracking-widest ${meta.chipClass} ${className}`}
    >
      {meta.short}
    </span>
  );
}
