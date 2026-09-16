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
      className={`rounded border border-dashed border-accent/20 bg-surface-muted/60 px-4 py-5 font-mono text-xs text-muted-foreground ${className}`}
    >
      <p>
        <span className="text-accent mr-2">&gt;</span>
        {message}
      </p>
      {hint && <p className="mt-1.5 pl-4 text-[11px] text-subtle-foreground">{hint}</p>}
    </div>
  );
}
