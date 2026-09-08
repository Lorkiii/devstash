"use client";

import React, { useEffect, useRef, useState } from "react";
import { Copy, Check, Eye, EyeOff } from "lucide-react";

interface MaskedValueProps {
  value: string;
  /** Screen-reader name for the controls, e.g. "Password". Never the value. */
  label: string;
  /** Non-secret values render visibly with only a copy control. */
  secret?: boolean;
  revealSeconds?: number;
  compact?: boolean;
}

const MASK = "••••••••••••";
const COPIED_FEEDBACK_MS = 2000;

// Masks by default; reveal is explicit and auto-hides; copy is explicit.
// The value lives only in React props/state and is never written to DOM
// attributes, so it is not exposed through data-* or aria-* text.
export function MaskedValue({
  value,
  label,
  secret = true,
  revealSeconds = 10,
  compact = false,
}: MaskedValueProps) {
  const [revealed, setRevealed] = useState<boolean>(false);
  const [remaining, setRemaining] = useState<number>(revealSeconds);
  const [copied, setCopied] = useState<boolean>(false);
  const copiedTimer = useRef<number | null>(null);

  const toggleReveal = () => {
    setRemaining(revealSeconds);
    setRevealed((current) => !current);
  };

  useEffect(() => {
    if (!revealed) return;
    const tick = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          setRevealed(false);
          return revealSeconds;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [revealed, revealSeconds]);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // Clipboard access can be denied; the UI simply shows no confirmation.
    }
  };

  const isMultiline = value.includes("\n");
  const showValue = !secret || revealed;
  const textSize = compact ? "text-[11px]" : "text-xs";

  return (
    <div className="flex items-start gap-2 min-w-0">
      <div
        className={`flex-1 min-w-0 rounded border border-[#6ea8ff]/15 bg-[#070d18]/90 px-2.5 py-1.5 font-mono ${textSize} ${
          showValue ? "text-[#e8eefb]" : "text-[#e8eefb]/40 tracking-[0.15em]"
        } ${isMultiline && showValue ? "whitespace-pre-wrap break-all" : "truncate"}`}
      >
        {showValue ? value : MASK}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {secret && (
          <button
            type="button"
            onClick={toggleReveal}
            aria-label={revealed ? `Hide ${label}` : `Reveal ${label}`}
            aria-pressed={revealed}
            className="relative inline-flex items-center justify-center w-7 h-7 rounded border border-[#6ea8ff]/20 text-[#e8eefb]/70 hover:text-[#6ea8ff] hover:border-[#6ea8ff]/50 transition-colors cursor-pointer"
          >
            {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {revealed && (
              <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 rounded-full bg-[#6ea8ff] text-[#05070d] text-[9px] font-bold leading-4 text-center">
                {remaining}
              </span>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${label}`}
          className={`inline-flex items-center justify-center w-7 h-7 rounded border transition-colors cursor-pointer ${
            copied
              ? "border-emerald-400/50 text-emerald-400"
              : "border-[#6ea8ff]/20 text-[#e8eefb]/70 hover:text-[#6ea8ff] hover:border-[#6ea8ff]/50"
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
