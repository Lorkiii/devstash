"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Copy, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { formatDate } from "@/app/lib/format";
import type { EnvBundleViewerProps } from "./env-bundle-viewer.types";

interface EnvLine {
  number: number;
  key: string;
  value: string;
  /** Comments and blank lines are shown as-is and never masked. */
  raw: string | null;
}

const MASK = "••••••••";
const COPIED_FEEDBACK_MS = 2000;

function parseEnv(content: string): EnvLine[] {
  return content.split("\n").map((line, index) => {
    const trimmed = line.trim();
    const separator = line.indexOf("=");
    if (trimmed === "" || trimmed.startsWith("#") || separator === -1) {
      return { number: index + 1, key: "", value: "", raw: line };
    }
    return {
      number: index + 1,
      key: line.slice(0, separator),
      value: line.slice(separator + 1),
      raw: null,
    };
  });
}

// Monospace .env view. The complete file, including names and comments, stays
// masked until the bundle-wide timed reveal. "Copy .env" copies the
// decrypted plaintext from memory; nothing is uploaded.
export function EnvBundleViewer({
  bundle,
  revealSeconds = 15,
  isDeleting,
  onEdit,
  onDelete,
}: EnvBundleViewerProps) {
  const [revealed, setRevealed] = useState<boolean>(false);
  const [remaining, setRemaining] = useState<number>(revealSeconds);
  const [copied, setCopied] = useState<boolean>(false);
  const copiedTimer = useRef<number | null>(null);
  const lines = parseEnv(bundle.content);

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

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(bundle.content);
      setCopied(true);
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // Clipboard denied; no confirmation shown.
    }
  };

  return (
    <div className="rounded border border-[#6ea8ff]/20 bg-[#070d18]/90 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-[#6ea8ff]/10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs text-[#e8eefb] truncate">.env.{bundle.environment}</span>
          <span className="font-mono text-[10px] text-[#e8eefb]/40">
            {lines.filter((line) => line.raw === null).length} vars · {formatDate(bundle.updatedAt)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={toggleReveal}
            aria-pressed={revealed}
            className="inline-flex items-center gap-1.5 rounded border border-[#6ea8ff]/20 px-2 py-1 font-mono text-[10px] tracking-widest text-[#e8eefb]/70 hover:text-[#6ea8ff] hover:border-[#6ea8ff]/50 transition-colors cursor-pointer"
          >
            {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {revealed ? `HIDE · ${remaining}s` : "REVEAL ALL"}
          </button>
          <button
            type="button"
            onClick={handleCopyAll}
            className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[10px] tracking-widest transition-colors cursor-pointer ${
              copied
                ? "border-emerald-400/50 text-emerald-400"
                : "border-[#6ea8ff]/20 text-[#e8eefb]/70 hover:text-[#6ea8ff] hover:border-[#6ea8ff]/50"
            }`}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "COPIED" : "COPY .ENV"}
          </button>
          <button
            type="button"
            onClick={onEdit}
            disabled={isDeleting}
            aria-label="Edit environment bundle"
            className="rounded border border-[#6ea8ff]/20 p-1 text-[#e8eefb]/65 hover:text-[#6ea8ff] disabled:opacity-50"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            aria-label="Delete environment bundle"
            className="rounded border border-rose-400/20 p-1 text-rose-300/70 hover:text-rose-200 disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      <ol className="font-mono text-xs leading-6 py-2 overflow-x-auto">
        {lines.map((line) => (
          <li key={line.number} className="grid grid-cols-[40px_1fr] hover:bg-[#6ea8ff]/5">
            <span className="text-right pr-3 text-[#e8eefb]/25 select-none">{line.number}</span>
            {!revealed ? (
              <span aria-label="Environment line masked" className="text-[#e8eefb]/35 tracking-widest">
                {line.raw === "" ? " " : MASK}
              </span>
            ) : line.raw !== null ? (
              <span className="text-[#e8eefb]/40 whitespace-pre">{line.raw || " "}</span>
            ) : (
              <span className="whitespace-nowrap pr-3">
                <span className="text-[#6ea8ff]">{line.key}</span>
                <span className="text-[#e8eefb]/40">=</span>
                <span className="text-[#e8eefb]">{line.value}</span>
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
