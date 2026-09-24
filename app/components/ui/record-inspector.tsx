"use client";

import React, { useEffect, useRef } from "react";

interface RecordInspectorProps {
  selected: boolean;
  listLabel: string;
  detailLabel: string;
  list: React.ReactNode;
  detail: React.ReactNode;
}

// The selected pane replaces the list on narrow screens; restore keyboard
// focus to the newly visible pane when a selection changes.
export function RecordInspector({ selected, listLabel, detailLabel, list, detail }: RecordInspectorProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const previousSelection = useRef<boolean | null>(null);

  useEffect(() => {
    const previous = previousSelection.current;
    previousSelection.current = selected;
    if (previous === selected || (previous === null && !selected) || !window.matchMedia("(max-width: 1023px)").matches) return;
    (selected ? detailRef : listRef).current?.focus();
  }, [selected]);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)]">
      <div
        ref={listRef}
        role="group"
        aria-label={listLabel}
        tabIndex={-1}
        className={`${selected ? "hidden lg:block" : ""} min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50`}
      >
        {list}
      </div>
      <div
        ref={detailRef}
        role="group"
        aria-label={detailLabel}
        tabIndex={-1}
        className={`${selected ? "" : "hidden lg:block"} min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50`}
      >
        {detail}
      </div>
    </div>
  );
}
