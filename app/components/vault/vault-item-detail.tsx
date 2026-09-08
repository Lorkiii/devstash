"use client";

import React from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { MaskedValue } from "@/app/components/ui/masked-value";
import { TypeBadge } from "@/app/components/ui/type-badge";
import type { VaultItem } from "@/app/lib/vault-data.types";
import { VAULT_TYPE_META } from "@/app/lib/vault-types";
import { formatDate } from "@/app/lib/format";

interface VaultItemDetailProps {
  item: VaultItem;
  projectName?: string;
  onBack: () => void;
}

export function VaultItemDetail({ item, projectName, onBack }: VaultItemDetailProps) {
  const meta = VAULT_TYPE_META[item.type];

  const actions = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled
        title="Editing arrives with the ciphertext API phase"
        className="inline-flex items-center gap-1 rounded border border-[#6ea8ff]/20 px-2 py-1 text-[10px] tracking-widest text-[#e8eefb]/50 disabled:cursor-not-allowed"
      >
        <Pencil className="w-3 h-3" /> EDIT
      </button>
      <button
        type="button"
        disabled
        title="Deletion arrives with the ciphertext API phase"
        className="inline-flex items-center gap-1 rounded border border-rose-400/20 px-2 py-1 text-[10px] tracking-widest text-rose-300/50 disabled:cursor-not-allowed"
      >
        <Trash2 className="w-3 h-3" /> DELETE
      </button>
    </div>
  );

  return (
    <ConsolePanel title={meta.label.toUpperCase()} status={`updated ${formatDate(item.updatedAt)}`} action={actions} className="h-full">
      <button
        type="button"
        onClick={onBack}
        className="lg:hidden mb-3 inline-flex items-center gap-1.5 text-[10px] tracking-widest text-[#6ea8ff]/80 hover:text-[#6ea8ff] cursor-pointer"
      >
        <ArrowLeft className="w-3 h-3" /> BACK TO LIST
      </button>

      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-[#e8eefb] truncate">{item.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-[#e8eefb]/50">
            <TypeBadge type={item.type} />
            {projectName && (
              <span className="px-1.5 py-0.5 rounded border border-[#e8eefb]/15 tracking-widest">{projectName}</span>
            )}
            {item.tags.map((tag) => (
              <span key={tag} className="text-[#e8eefb]/40">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <dl className="space-y-3">
        {item.fields.map((field) => (
          <div key={field.key}>
            <dt className="mb-1 text-[10px] tracking-widest text-[#e8eefb]/45 uppercase">{field.label}</dt>
            <dd>
              <MaskedValue value={field.value} label={field.label} secret={field.secret} />
            </dd>
          </div>
        ))}
      </dl>

      {item.notes && (
        <div className="mt-4 pt-3 border-t border-[#6ea8ff]/10">
          <div className="mb-1 text-[10px] tracking-widest text-[#e8eefb]/45">NOTES</div>
          <p className="text-xs text-[#e8eefb]/75 whitespace-pre-wrap">{item.notes}</p>
        </div>
      )}

      <p className="mt-4 text-[10px] text-[#e8eefb]/35">
        Reveal auto-hides after 10s. Copy is explicit; clipboard clearing is best-effort and not guaranteed.
      </p>
    </ConsolePanel>
  );
}
