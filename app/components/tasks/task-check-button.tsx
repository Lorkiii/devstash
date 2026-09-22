"use client";

import React from "react";
import { Check } from "lucide-react";

interface TaskCheckButtonProps {
  done: boolean;
  disabled?: boolean;
  label: string;
  onToggle: () => void;
}

export function TaskCheckButton({ done, disabled, label, onToggle }: TaskCheckButtonProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      onClick={onToggle}
      disabled={disabled}
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 ${
        done
          ? "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-emerald-950"
          : "border border-accent/50 bg-transparent hover:border-accent hover:bg-accent/10"
      }`}
    >
      {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : null}
    </button>
  );
}
