"use client";

import React from "react";
import { KeyRound, Pencil, Trash2 } from "lucide-react";
import { MaskedValue } from "@/app/components/ui/masked-value";
import { Modal } from "@/app/components/ui/modal";
import { TypeBadge } from "@/app/components/ui/type-badge";
import { VAULT_TYPE_META } from "@/app/lib/vault-types";
import { formatDate } from "@/app/lib/format";
import type { VaultItemDetailProps } from "./vault-item-detail.types";

export function VaultItemDetail({
  item,
  projectName,
  isDeleting,
  actionError,
  fallbackFocusRef,
  onClose,
  onEdit,
  onDelete,
}: VaultItemDetailProps) {
  const meta = VAULT_TYPE_META[item.type];

  const actions = (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={onEdit}
        disabled={isDeleting}
        className="inline-flex min-h-11 items-center gap-1.5 rounded border border-accent/20 px-2.5 py-1 text-[10px] tracking-wider text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/55 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Pencil className="w-3 h-3" /> EDIT
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting}
        className="inline-flex min-h-11 items-center gap-1.5 rounded border border-rose-400/20 px-2.5 py-1 text-[10px] tracking-wider text-rose-700 dark:text-rose-300/75 hover:text-rose-800 dark:hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/55 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 className="w-3 h-3" /> {isDeleting ? "DELETING…" : "DELETE"}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="VAULT RECORD"
      status={meta.label.toUpperCase()}
      description="Sensitive fields stay masked until you choose to reveal or copy them."
      icon={<KeyRound className="h-4 w-4" />}
      maxWidth="2xl"
      closeDisabled={isDeleting}
      fallbackFocusRef={fallbackFocusRef}
      footer={actions}
    >
      <h3 className="mb-2 break-words font-sans text-lg font-semibold tracking-tight text-foreground sm:text-xl">{item.title}</h3>
      <div className="mb-4 flex flex-wrap items-center gap-1.5 border-b border-accent/12 pb-3 text-[10px] text-subtle-foreground">
        <TypeBadge type={item.type} />
        {projectName && <span className="rounded border border-foreground/15 px-1.5 py-0.5">{projectName}</span>}
        {item.tags.map((tag) => <span key={tag}>#{tag}</span>)}
        <span className="ml-auto whitespace-nowrap">Updated {formatDate(item.updatedAt)}</span>
      </div>
      <dl className="space-y-2.5 sm:space-y-3">
        {item.fields.map((field) => (
          <div key={field.key}>
            <dt className="mb-1 text-[9px] uppercase tracking-widest text-subtle-foreground sm:text-[10px]">{field.label}</dt>
            <dd>
              <MaskedValue value={field.value} label={field.label} secret={field.secret} />
            </dd>
          </div>
        ))}
      </dl>

      {item.notes && (
        <div className="mt-3 border-t border-accent/10 pt-2.5 sm:mt-4 sm:pt-3">
          <div className="mb-1 text-[9px] tracking-widest text-subtle-foreground sm:text-[10px]">NOTES</div>
          <p className="whitespace-pre-wrap text-[11px] text-muted-foreground sm:text-xs">{item.notes}</p>
        </div>
      )}

      {actionError && <p role="alert" className="mt-3 text-[11px] text-rose-700 dark:text-rose-300 sm:mt-4 sm:text-xs">{actionError}</p>}

      <p className="mt-3 text-[9px] text-subtle-foreground sm:mt-4 sm:text-[10px]">
        Reveal auto-hides after 10s. Copy is explicit; clipboard clearing is best-effort and not guaranteed.
      </p>
    </Modal>
  );
}
