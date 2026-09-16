"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { persistThemePreference } from "@/app/lib/theme-client";
import type { ThemePreference } from "@/app/lib/theme";
import type { ThemeContextValue, ThemeProviderProps } from "./theme-provider.types";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: ThemePreference) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemePreference>(initialTheme);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setTheme = useCallback(async (nextTheme: ThemePreference) => {
    if (nextTheme === theme || isSaving) return;

    const previousTheme = theme;
    setThemeState(nextTheme);
    applyTheme(nextTheme);
    setError(null);
    setIsSaving(true);

    try {
      await persistThemePreference(nextTheme);
    } catch {
      setThemeState(previousTheme);
      applyTheme(previousTheme);
      setError("Theme could not be saved. Your previous theme was restored.");
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, theme]);

  return (
    <ThemeContext.Provider value={{ theme, isSaving, error, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider.");
  return context;
}
