import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import test from "node:test";
import {
  DEFAULT_THEME,
  THEME_COOKIE_MAX_AGE_SECONDS,
  THEME_COOKIE_NAME,
  parseThemePreference,
  themePreferenceCookieOptions,
  themePreferenceRequestSchema,
} from "../app/lib/theme";

test("theme preference accepts only the exact light or dark request contract", () => {
  assert.deepEqual(themePreferenceRequestSchema.parse({ theme: "light" }), { theme: "light" });
  assert.deepEqual(themePreferenceRequestSchema.parse({ theme: "dark" }), { theme: "dark" });
  assert.equal(themePreferenceRequestSchema.safeParse({ theme: "system" }).success, false);
  assert.equal(themePreferenceRequestSchema.safeParse({ theme: "dark", ownerId: "attacker" }).success, false);
  assert.equal(themePreferenceRequestSchema.safeParse({}).success, false);
});

test("missing and invalid theme cookies fail closed to the dark default", () => {
  assert.equal(DEFAULT_THEME, "dark");
  assert.equal(parseThemePreference(undefined), "dark");
  assert.equal(parseThemePreference("system"), "dark");
  assert.equal(parseThemePreference("LIGHT"), "dark");
  assert.equal(parseThemePreference("light"), "light");
});

test("theme cookie is device scoped, HTTP-only, and secure on HTTPS", () => {
  assert.equal(THEME_COOKIE_NAME, "devstash-theme");
  assert.equal(THEME_COOKIE_MAX_AGE_SECONDS, 31_536_000);
  assert.deepEqual(themePreferenceCookieOptions("https://devstash.example.test"), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 31_536_000,
  });
  assert.equal(themePreferenceCookieOptions("http://localhost:3000").secure, false);
});

async function componentSources(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return componentSources(path);
    return extname(path) === ".tsx" ? [path] : [];
  }));
  return nested.flat();
}

test("components use semantic theme tokens instead of the legacy core palette", async () => {
  const legacyPalette = /#(?:05070d|e8eefb|6ea8ff|0a1220|070d18)/iu;
  for (const path of await componentSources(join(process.cwd(), "app"))) {
    const source = await readFile(path, "utf8");
    assert.doesNotMatch(source, legacyPalette, relative(process.cwd(), path));
  }
});
