"use client";

import type { ThemePreference } from "./theme";

export class ThemePreferenceRequestError extends Error {
  override readonly name = "ThemePreferenceRequestError";
}

export async function persistThemePreference(theme: ThemePreference): Promise<void> {
  const response = await fetch("/api/preferences/theme", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme }),
  });

  if (!response.ok) throw new ThemePreferenceRequestError("Theme preference was not saved.");

  const result: unknown = await response.json();
  if (
    typeof result !== "object" ||
    result === null ||
    !("success" in result) ||
    result.success !== true ||
    !("data" in result) ||
    typeof result.data !== "object" ||
    result.data === null ||
    !("theme" in result.data) ||
    result.data.theme !== theme
  ) {
    throw new ThemePreferenceRequestError("Theme preference response was invalid.");
  }
}
