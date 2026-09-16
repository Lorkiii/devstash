import type { ReactNode } from "react";
import type { ThemePreference } from "@/app/lib/theme";

export interface ThemeProviderProps {
  children: ReactNode;
  initialTheme: ThemePreference;
}

export interface ThemeContextValue {
  theme: ThemePreference;
  isSaving: boolean;
  error: string | null;
  setTheme: (theme: ThemePreference) => Promise<void>;
}
