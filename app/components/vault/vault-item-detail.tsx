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
        className="inline-flex min-h-10 items-center gap-1 rounded border border-accent/20 px-2 py-1 text-[10px] tracking-widest text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Pencil className="w-3 h-3" /> EDIT
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting}
        className="inline-flex min-h-10 items-center gap-1 rounded border border-rose-400/20 px-2 py-1 text-[10px] tracking-widest text-rose-300/75 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
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
        className="lg:hidden mb-3 inline-flex items-center gap-1.5 text-[10px] tracking-widest text-accent hover:text-accent cursor-pointer"
      >
        <ArrowLeft className="w-3 h-3" /> BACK TO LIST
      </button>

      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-foreground truncate">{item.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-subtle-foreground">
            <TypeBadge type={item.type} />
            {projectName && (
              <span className="px-1.5 py-0.5 rounded border border-foreground/15 tracking-widest">{projectName}</span>
            )}
            {item.tags.map((tag) => (
              <span key={tag} className="text-subtle-foreground">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <dl className="space-y-3">
        {item.fields.map((field) => (
          <div key={field.key}>
            <dt className="mb-1 text-[10px] tracking-widest text-subtle-foreground uppercase">{field.label}</dt>
            <dd>
              <MaskedValue value={field.value} label={field.label} secret={field.secret} />
            </dd>
          </div>
        ))}
      </dl>

      {item.notes && (
        <div className="mt-4 pt-3 border-t border-accent/10">
          <div className="mb-1 text-[10px] tracking-widest text-subtle-foreground">NOTES</div>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{item.notes}</p>
        </div>
      )}

      {actionError && <p role="alert" className="mt-4 text-xs text-rose-300">{actionError}</p>}

      <p className="mt-4 text-[10px] text-subtle-foreground">
        Reveal auto-hides after 10s. Copy is explicit; clipboard clearing is best-effort and not guaranteed.
      </p>
    </>
  );

  if (embedded) {
    return (
      <section className="min-w-0 px-4 py-4 sm:px-5">
        <header className="mb-4 flex flex-col gap-3 border-b border-accent/12 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] font-bold tracking-widest text-violet-300">{meta.label.toUpperCase()}</div>
            <div className="mt-1 text-[10px] tracking-wider text-subtle-foreground">updated {formatDate(item.updatedAt)}</div>
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
