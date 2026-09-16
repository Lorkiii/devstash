"use client";

import React from "react";
import { Check, Copy, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { formatDate } from "@/app/lib/format";
import { useSensitiveValueControls } from "@/app/lib/sensitive-value-controls";
import type { EnvBundleViewerProps } from "./env-bundle-viewer.types";

interface EnvLine {
  number: number;
  key: string;
  value: string;
  /** Comments and blank lines are shown as-is and never masked. */
  raw: string | null;
}

const MASK = "••••••••";

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
  embedded = false,
  isDeleting,
  onEdit,
  onDelete,
}: EnvBundleViewerProps) {
  const controls = useSensitiveValueControls(bundle.content, revealSeconds);
  const lines = parseEnv(bundle.content);

  return (
    <div className={embedded ? "min-w-0 overflow-hidden" : "overflow-hidden rounded border border-accent/20 bg-surface-muted/90"}>
      <div className="flex flex-col items-stretch gap-3 border-b border-accent/10 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs text-foreground truncate">.env.{bundle.environment}</span>
          <span className="font-mono text-[10px] text-subtle-foreground">
            {lines.filter((line) => line.raw === null).length} vars · {formatDate(bundle.updatedAt)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0 sm:justify-end">
          <button
            type="button"
            onClick={controls.toggleReveal}
            aria-label={controls.revealed ? "Hide environment bundle" : "Reveal environment bundle"}
            aria-pressed={controls.revealed}
            className="inline-flex min-h-10 items-center gap-1.5 rounded border border-accent/20 px-2.5 py-1 font-mono text-[10px] tracking-widest text-muted-foreground hover:text-accent hover:border-accent/50 transition-colors cursor-pointer"
          >
            {controls.revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {controls.revealed ? `HIDE · ${controls.remainingSeconds}s` : "REVEAL ALL"}
          </button>
          <button
            type="button"
            onClick={() => void controls.copy()}
            aria-label="Copy complete environment bundle"
            className={`inline-flex min-h-10 items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-[10px] tracking-widest transition-colors cursor-pointer ${
              controls.copyStatus === "copied"
                ? "border-emerald-400/50 text-emerald-400"
                : controls.copyStatus === "error"
                  ? "border-rose-400/50 text-rose-300"
                : "border-accent/20 text-muted-foreground hover:text-accent hover:border-accent/50"
            }`}
          >
            {controls.copyStatus === "copied" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {controls.copyStatus === "copied" ? "COPIED" : controls.copyStatus === "error" ? "COPY FAILED" : "COPY .ENV"}
          </button>
          <button
            type="button"
            onClick={onEdit}
            disabled={isDeleting}
            aria-label="Edit environment bundle"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded border border-accent/20 p-1 text-muted-foreground hover:text-accent disabled:opacity-50"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            aria-label="Delete environment bundle"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded border border-rose-400/20 p-1 text-rose-300/70 hover:text-rose-200 disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      <ol className="font-mono text-xs leading-6 py-2 overflow-x-auto">
        {lines.map((line) => (
          <li key={line.number} className="grid grid-cols-[40px_1fr] hover:bg-accent/5">
            <span className="text-right pr-3 text-subtle-foreground select-none">{line.number}</span>
            {!controls.revealed ? (
              <span aria-label="Environment line masked" className="text-subtle-foreground tracking-widest">
                {line.raw === "" ? " " : MASK}
              </span>
            ) : line.raw !== null ? (
              <span className="text-subtle-foreground whitespace-pre">{line.raw || " "}</span>
            ) : (
              <span className="whitespace-nowrap pr-3">
                <span className="text-accent">{line.key}</span>
                <span className="text-subtle-foreground">=</span>
                <span className="text-foreground">{line.value}</span>
              </span>
            )}
          </li>
        ))}
      </ol>
      <span className="sr-only" role="status">
        {controls.copyStatus === "copied"
          ? "Environment bundle copied. Clipboard clearing is best effort."
          : controls.copyStatus === "error"
            ? "Environment bundle could not be copied."
            : ""}
      </span>
    </div>
  );
}
