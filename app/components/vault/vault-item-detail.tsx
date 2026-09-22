"use client";

import React from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { MaskedValue } from "@/app/components/ui/masked-value";
import { TypeBadge } from "@/app/components/ui/type-badge";
import { VAULT_TYPE_META } from "@/app/lib/vault-types";
import { formatDate } from "@/app/lib/format";
import type { VaultItemDetailProps } from "./vault-item-detail.types";

export function VaultItemDetail({
  item,
  projectName,
  embedded = false,
  isDeleting,
  actionError,
  onBack,
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
        className="inline-flex min-h-8 items-center gap-1 rounded border border-accent/20 px-1.5 py-1 text-[9px] tracking-widest text-muted-foreground hover:text-foreground sm:min-h-10 sm:px-2 sm:text-[10px] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Pencil className="w-3 h-3" /> EDIT
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting}
        className="inline-flex min-h-8 items-center gap-1 rounded border border-rose-400/20 px-1.5 py-1 text-[9px] tracking-widest text-rose-700 dark:text-rose-300/75 hover:text-rose-800 dark:hover:text-rose-200 sm:min-h-10 sm:px-2 sm:text-[10px] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 className="w-3 h-3" /> {isDeleting ? "DELETING…" : "DELETE"}
      </button>
    </div>
  );

  const content = (
    <>
      <button
        type="button"
        onClick={onBack}
        className="lg:hidden mb-2.5 inline-flex items-center gap-1.5 text-[9px] tracking-widest text-accent hover:text-accent cursor-pointer sm:mb-3 sm:text-[10px]"
      >
        <ArrowLeft className="w-3 h-3" /> BACK TO LIST
      </button>

      <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
        <div className="min-w-0">
          <h3 className="text-[13px] font-bold text-foreground truncate sm:text-base">{item.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-[9px] text-subtle-foreground sm:gap-1.5 sm:text-[10px]">
            <TypeBadge type={item.type} />
            {projectName && (
              <span className="rounded border border-foreground/15 px-1 py-0.5 tracking-widest sm:px-1.5">{projectName}</span>
            )}
            {item.tags.map((tag) => (
              <span key={tag} className="text-subtle-foreground">
                #{tag}
              </span>
            ))}
          </div>
        </div>
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
    </>
  );

  if (embedded) {
    return (
      <section className="min-w-0 px-3 py-3 sm:px-5 sm:py-4">
        <header className="mb-3 flex flex-col gap-2.5 border-b border-accent/12 pb-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pb-4">
          <div>
            <div className="text-[9px] font-bold tracking-widest text-violet-700 dark:text-violet-300 sm:text-[10px]">{meta.label.toUpperCase()}</div>
            <div className="mt-0.5 text-[9px] tracking-wider text-subtle-foreground sm:mt-1 sm:text-[10px]">updated {formatDate(item.updatedAt)}</div>
          </div>
          {actions}
        </header>
        {content}
      </section>
    );
  }

  return (
    <ConsolePanel title={meta.label.toUpperCase()} status={`updated ${formatDate(item.updatedAt)}`} action={actions} className="h-full">
      {content}
    </ConsolePanel>
  );
}
