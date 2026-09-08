import React from "react";

interface EmptyStateProps {
  message: string;
  hint?: string;
  className?: string;
}

// Terminal-output style empty state: "> message".
export function EmptyState({ message, hint, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`rounded border border-dashed border-[#6ea8ff]/20 bg-[#070d18]/60 px-4 py-5 font-mono text-xs text-[#e8eefb]/55 ${className}`}
    >
      <p>
        <span className="text-[#6ea8ff]/70 mr-2">&gt;</span>
        {message}
      </p>
      {hint && <p className="mt-1.5 pl-4 text-[11px] text-[#e8eefb]/40">{hint}</p>}
    </div>
  );
}
