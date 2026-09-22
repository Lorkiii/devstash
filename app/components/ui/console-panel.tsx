import React from "react";

export type ConsolePanelTone = "blue" | "amber" | "green" | "red" | "muted" | "notes" | "tasks" | "env" | "secrets";
export type ConsolePanelSurface = "atmospheric" | "flat";

interface ConsolePanelProps {
  title: string;
  /** Short mono text shown on the right of the header row. */
  status?: string;
  tone?: ConsolePanelTone;
  surface?: ConsolePanelSurface;
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
  notes: "bg-amber-400",
  tasks: "bg-emerald-400",
  env: "bg-cyan-400",
  secrets: "bg-violet-400",
};

// Terminal-style card used across the app shell. Theme tokens keep the console
// frame crisp in light mode without flattening the darker vault experience.
export function ConsolePanel({
  title,
  status,
  tone = "blue",
  surface = "atmospheric",
  action,
  className = "",
  bodyClassName = "",
  children,
}: ConsolePanelProps) {
  return (
    <section
      data-panel-tone={tone}
      data-panel-surface={surface}
      className={`devstash-panel flex min-h-0 flex-col overflow-hidden rounded-2xl border text-foreground ${className}`}
    >
      <header className="devstash-panel-header flex flex-col items-start gap-1.5 border-b px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-3">
        <div className="flex items-center gap-1.5 min-w-0 sm:gap-2">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2 ${DOT_CLASS[tone]}`} />
          <h3 className="truncate font-mono text-[10px] font-bold tracking-widest text-accent sm:text-[11px]">{title}</h3>
        </div>
        {(action || status) && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end sm:gap-3">
            {action}
            {status && (
              <span className="whitespace-nowrap font-mono text-[9px] tracking-wider text-subtle-foreground sm:text-[10px]">{status}</span>
            )}
          </div>
        )}
      </header>
      <div className={`min-h-0 flex-1 p-2.5 sm:p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
