"use client";

import { Check, Moon, Sun } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { useTheme } from "@/app/components/theme/theme-provider";
import type { ThemePreference } from "@/app/lib/theme";

const THEME_OPTIONS: ReadonlyArray<{
  value: ThemePreference;
  label: string;
  description: string;
  previewClass: string;
  icon: typeof Sun;
}> = [
  {
    value: "light",
    label: "Light",
    description: "Bright surfaces, slate text, and restrained blue depth.",
    previewClass: "theme-preview-light",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "The original low-light DevStash console appearance.",
    previewClass: "theme-preview-dark",
    icon: Moon,
  },
];

export function AppearanceSettings() {
  const { theme, setTheme, isSaving, error } = useTheme();

  return (
    <ConsolePanel title="THEME" status={isSaving ? "SAVING" : `${theme.toUpperCase()} · DEVICE`}>
      <fieldset disabled={isSaving}>
        <legend className="sr-only">Choose an application theme</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {THEME_OPTIONS.map((option) => {
            const selected = option.value === theme;
            const Icon = option.icon;
            return (
              <label
                key={option.value}
                className={`group relative min-h-32 cursor-pointer rounded-xl border p-3.5 transition-all focus-within:ring-2 focus-within:ring-accent/45 focus-within:ring-offset-2 focus-within:ring-offset-surface ${
                  selected
                    ? "border-accent bg-accent/8 shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_20%,transparent)]"
                    : "border-border/70 bg-surface-inset/70 hover:border-accent/45 hover:bg-accent/5"
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
                <span className={`mb-3 flex h-12 items-center justify-between rounded-lg border border-current/15 px-3 ${option.previewClass}`}>
                  <span className="flex gap-1.5" aria-hidden="true">
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-35" />
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-20" />
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-15" />
                  </span>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-foreground">{option.label}</span>
                  <span className={`grid h-5 w-5 place-items-center rounded-full border ${selected ? "border-accent bg-accent text-accent-foreground" : "border-border"}`}>
                    {selected && <Check className="h-3 w-3" aria-hidden="true" />}
                  </span>
                </span>
                <span className="mt-1.5 block text-sm leading-5 text-muted-foreground">
                  {option.description}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <p className="mt-3 text-xs leading-5 text-subtle-foreground">
        Saved on this device and applied before the page renders. Theme choice never contains vault data.
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-200">{error}</p>}
    </ConsolePanel>
  );
}
