"use client";

import React from "react";
import { ShieldLockIcon } from "./icons";
import type { ModalMaxWidth, ModalProps } from "./modal.types";

const MAX_WIDTH_CLASS: Record<ModalMaxWidth, string> = {
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
};

// Shared overlay + frame for informational dialogs. Content is supplied by the
// page that opens it; this shell never renders secret values.
export function Modal({
  isOpen,
  onClose,
  title,
  footerLabel,
  footerAction,
  maxWidth = "2xl",
  children,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${MAX_WIDTH_CLASS[maxWidth]} max-h-[90vh] overflow-y-auto rounded-lg border border-[#6ea8ff]/40 bg-[#0a1220] p-6 text-[#e8eefb] shadow-[0_0_50px_rgba(110,168,255,0.2)] font-mono`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#6ea8ff]/20">
          <div className="flex items-center gap-2.5">
            <ShieldLockIcon className="w-5 h-5 text-[#6ea8ff]" />
            <h2 className="text-base font-bold tracking-wider text-[#e8eefb]">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-xs px-2.5 py-1 rounded bg-[#6ea8ff]/15 hover:bg-[#6ea8ff]/30 text-[#6ea8ff] border border-[#6ea8ff]/30 transition-colors cursor-pointer"
          >
            [ ESC / CLOSE ]
          </button>
        </div>

        {children}

        <div className="mt-6 pt-4 border-t border-[#6ea8ff]/20 flex items-center justify-between text-[11px] font-mono text-[#e8eefb]/50">
          <span>{footerLabel}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#6ea8ff] text-[#05070d] font-bold hover:bg-[#8ab9ff] transition-all cursor-pointer"
          >
            {footerAction}
          </button>
        </div>
      </div>
    </div>
  );
}
