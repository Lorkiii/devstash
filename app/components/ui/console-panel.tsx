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
  blue: "bg-[#6ea8ff]",
  amber: "bg-amber-400",
  green: "bg-emerald-400",
  red: "bg-rose-400",
  muted: "bg-[#e8eefb]/30",
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
      className={`rounded-lg border border-[#6ea8ff]/25 bg-[#0a1220]/85 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.45)] font-mono text-[#e8eefb] flex flex-col min-h-0 ${className}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-[#6ea8ff]/15 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${DOT_CLASS[tone]}`} />
          <h2 className="text-[11px] font-bold tracking-widest text-[#6ea8ff] truncate">{title}</h2>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {action}
          {status && (
            <span className="text-[10px] tracking-wider text-[#e8eefb]/55 whitespace-nowrap">{status}</span>
          )}
        </div>
      </header>
      <div className={`p-4 min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
