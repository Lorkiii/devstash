"use client";

import React from "react";
import { Copy, Check, Eye, EyeOff } from "lucide-react";
import { useSensitiveValueControls } from "@/app/lib/sensitive-value-controls";
import type { MaskedValueProps } from "./masked-value.types";

const MASK = "••••••••••••";
// Masks by default; reveal is explicit and auto-hides; copy is explicit.
// The value lives only in React props/state and is never written to DOM
// attributes, so it is not exposed through data-* or aria-* text.
export function MaskedValue({
  value,
  label,
  secret = true,
  revealSeconds = 10,
  compact = false,
  wrap = false,
}: MaskedValueProps) {
  const controls = useSensitiveValueControls(value, revealSeconds);

  const isMultiline = value.includes("\n");
  const showValue = !secret || controls.revealed;
  const textSize = compact ? "text-[11px]" : "text-xs";

  return (
    <div className="flex items-start gap-2 min-w-0">
      <div
        className={`flex-1 min-w-0 rounded border border-accent/15 bg-surface-muted/90 px-2.5 py-1.5 font-mono ${textSize} ${
          showValue ? "text-foreground" : "text-subtle-foreground tracking-[0.15em]"
        } ${(isMultiline || wrap) && showValue ? "whitespace-pre-wrap break-all" : "truncate"}`}
      >
        {showValue ? value : MASK}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {secret && (
          <button
            type="button"
            onClick={controls.toggleReveal}
            aria-label={controls.revealed ? `Hide ${label}` : `Reveal ${label}`}
            aria-pressed={controls.revealed}
            className="relative inline-flex min-h-10 min-w-10 items-center justify-center rounded border border-accent/20 text-muted-foreground hover:text-accent hover:border-accent/50 transition-colors cursor-pointer"
          >
            {controls.revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {controls.revealed && (
              <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 rounded-full bg-accent text-accent-foreground text-[9px] font-bold leading-4 text-center">
                {controls.remainingSeconds}
              </span>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => void controls.copy()}
          aria-label={`Copy ${label}`}
          className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded border transition-colors cursor-pointer ${
            controls.copyStatus === "copied"
              ? "border-emerald-400/50 text-emerald-400"
              : controls.copyStatus === "error"
                ? "border-rose-400/50 text-rose-300"
              : "border-accent/20 text-muted-foreground hover:text-accent hover:border-accent/50"
          }`}
        >
          {controls.copyStatus === "copied" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <span className="sr-only" role="status">
        {controls.copyStatus === "copied"
          ? `${label} copied. Clipboard clearing is best effort.`
          : controls.copyStatus === "error"
            ? `${label} could not be copied.`
            : ""}
      </span>
    </div>
  );
}
