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
        <div className="font-mono text-[10px] tracking-[0.2em] text-[#6ea8ff]">{eyebrow}</div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#e8eefb]">{title}</h1>
        {description && <p className="mt-0.5 text-xs text-[#e8eefb]/55 max-w-xl">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">{actions}</div>}
    </div>
  );
}
