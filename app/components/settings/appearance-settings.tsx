"use client";

import { Moon, Sun } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { useTheme } from "@/app/components/theme/theme-provider";
import type { ThemePreference } from "@/app/lib/theme";

const THEME_OPTIONS: ReadonlyArray<{
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}> = [
  {
    value: "light",
    label: "Light",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    icon: Moon,
  },
];

export function AppearanceSettings() {
  const { theme, setTheme, isSaving, error } = useTheme();

  return (
    <ConsolePanel title="THEME" status={isSaving ? "SAVING" : `${theme.toUpperCase()} · DEVICE`}>
      <fieldset disabled={isSaving}>
        <legend className="sr-only">Choose an application theme</legend>
        <div className="grid w-full grid-cols-2 gap-1 rounded-xl border border-border/70 bg-surface-inset/70 p-1 sm:w-fit">
          {THEME_OPTIONS.map((option) => {
            const selected = option.value === theme;
            const Icon = option.icon;
            return (
              <label
                key={option.value}
                className={`inline-flex min-h-9 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2.5 font-mono text-[11px] font-semibold transition-colors sm:gap-2 sm:text-xs focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-surface motion-reduce:transition-none sm:min-h-11 sm:min-w-28 sm:px-4 ${
                  selected
                    ? "border-accent/60 bg-accent/15 text-accent-strong shadow-sm"
                    : "border-transparent text-muted-foreground hover:bg-surface hover:text-foreground"
                } ${isSaving ? "cursor-wait opacity-75" : ""}`}
              >
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={selected}
                  onChange={() => void setTheme(option.value)}
                  className="sr-only"
                />
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {error && <p role="alert" className="mt-2.5 text-[13px] text-rose-600 dark:text-rose-200 sm:mt-3 sm:text-sm">{error}</p>}
    </ConsolePanel>
  );
}
