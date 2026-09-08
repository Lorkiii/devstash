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
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="font-mono text-[10px] tracking-[0.2em] text-[#6ea8ff]">{eyebrow}</div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#e8eefb]">{title}</h1>
        {description && <p className="mt-0.5 text-xs text-[#e8eefb]/55 max-w-xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
