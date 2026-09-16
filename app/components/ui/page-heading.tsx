import React from "react";

interface PageHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  /** Right-aligned controls (filters, primary action). */
  actions?: React.ReactNode;
}

export function PageHeading({ eyebrow, title, description, actions }: PageHeadingProps) {
  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="font-mono text-[10px] tracking-[0.2em] text-accent">{eyebrow}</div>
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">{actions}</div>}
    </div>
  );
}
