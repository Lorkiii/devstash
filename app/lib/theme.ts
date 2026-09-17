import { z } from "./validation/zod";

export const THEME_COOKIE_NAME = "devstash-theme";
export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export const DEFAULT_THEME = "dark" as const;

export const themePreferenceSchema = z.enum(["light", "dark"]);
export const themePreferenceRequestSchema = z.strictObject({
  theme: themePreferenceSchema,
});

export type ThemePreference = z.infer<typeof themePreferenceSchema>;

export const THEME_STARFIELD_COLORS: Record<
  ThemePreference,
  { cyan: string; white: string; cool: string }
> = {
  dark: { cyan: "#6ea8ff", white: "#ffffff", cool: "#dbe7ff" },
  light: { cyan: "#2563eb", white: "#5f83c5", cool: "#93b4e8" },
};

export function parseThemePreference(value: string | undefined): ThemePreference {
  const parsed = themePreferenceSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_THEME;
}

export function themePreferenceCookieOptions(origin: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: new URL(origin).protocol === "https:",
    path: "/",
    maxAge: THEME_COOKIE_MAX_AGE_SECONDS,
  };
}
