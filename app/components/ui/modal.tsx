"use client";

import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { ShieldLockIcon } from "./icons";
import type { ModalMaxWidth, ModalProps } from "./modal.types";

const MAX_WIDTH_CLASS: Record<ModalMaxWidth, string> = {
  md: "max-w-md",
  lg: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
};

// Feature components retain sensitive form state; this shared shell manages
// only modal presentation, dismissal, and focus restoration.
export function Modal({
  isOpen,
  onClose,
  title,
  status,
  description,
  icon,
  footer,
  maxWidth = "2xl",
  bodyClassName = "p-4 sm:p-6",
  closeDisabled = false,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    openerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    if (!dialog.open) dialog.showModal();

    return () => {
      if (dialog.open) dialog.close();
      const opener = openerRef.current;
      openerRef.current = null;
      if (opener?.isConnected) opener.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const requestClose = () => {
    if (!closeDisabled) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
      className={`devstash-modal devstash-panel shadow-modal fixed inset-0 m-auto w-[calc(100%-1rem)] ${MAX_WIDTH_CLASS[maxWidth]} max-h-[calc(100dvh-1rem)] overflow-hidden rounded-2xl border p-0 font-mono text-foreground outline-none animate-fadeIn sm:w-[calc(100%-2rem)] sm:max-h-[calc(100dvh-2rem)]`}
    >
      <div className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col sm:max-h-[calc(100dvh-2rem)]">
        <div
          aria-hidden="true"
          className="h-px shrink-0 bg-linear-to-r from-transparent via-accent/80 to-transparent"
        />
        <header className="devstash-panel-header flex shrink-0 items-start gap-3 border-b px-4 py-3.5 sm:px-6 sm:py-4">
          <span
            aria-hidden="true"
            className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-accent/25 bg-accent/10 text-accent"
          >
            {icon ?? <ShieldLockIcon className="h-4.5 w-4.5" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2.5">
              <h2
                id={titleId}
                className="break-words text-sm font-bold tracking-[0.12em] text-foreground sm:text-base"
              >
                {title}
              </h2>
              {status && (
                <span className="rounded border border-accent/20 bg-background/70 px-2 py-0.5 text-[9px] tracking-[0.16em] text-accent">
                  {status}
                </span>
              )}
            </div>
            {description && (
              <p
                id={descriptionId}
                className="mt-1.5 max-w-prose font-sans text-xs leading-relaxed text-muted-foreground"
              >
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={closeDisabled}
            aria-label={`Close ${title}`}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-accent/20 bg-background/45 px-2.5 text-muted-foreground transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-accent disabled:cursor-not-allowed disabled:opacity-35"
          >
            <X className="h-4 w-4" />
            <span className="hidden text-[9px] tracking-widest sm:inline">ESC</span>
          </button>
        </header>

        <div className={`min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}>{children}</div>

        {footer && (
          <footer className="devstash-panel-header flex shrink-0 flex-col items-stretch gap-3 border-t px-4 py-3.5 text-[10px] text-subtle-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </dialog>
  );
}
