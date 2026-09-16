import React from "react";

export type ConsolePanelTone = "blue" | "amber" | "green" | "red" | "muted";

interface ConsolePanelProps {
  title: string;
  /** Short mono text shown on the right of the header row. */
  status?: string;
  tone?: ConsolePanelTone;
  /** Optional control rendered in the header (filters, buttons). */
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

const DOT_CLASS: Record<ConsolePanelTone, string> = {
  blue: "bg-accent",
  amber: "bg-amber-400",
  green: "bg-emerald-400",
  red: "bg-rose-400",
  muted: "bg-subtle-foreground",
};

// Terminal-style card used across the app shell. Same frame as the landing
// page's access panel: dark surface, blue hairline border, mono header row.
export function ConsolePanel({
  title,
  status,
  tone = "blue",
  action,
  className = "",
  bodyClassName = "",
  children,
}: ConsolePanelProps) {
  return (
    <section
      className={`shadow-panel flex min-h-0 flex-col rounded-xl border border-border/80 bg-surface/92 text-foreground backdrop-blur-md ${className}`}
    >
      <header className="flex flex-col items-start gap-2 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${DOT_CLASS[tone]}`} />
          <h3 className="truncate font-mono text-[11px] font-bold tracking-widest text-accent">{title}</h3>
        </div>
        {(action || status) && (
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:shrink-0 sm:justify-end">
            {action}
            {status && (
              <span className="whitespace-nowrap font-mono text-[10px] tracking-wider text-subtle-foreground">{status}</span>
            )}
          </div>
        )}
      </header>
      <div className={`min-h-0 flex-1 p-4 sm:p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
