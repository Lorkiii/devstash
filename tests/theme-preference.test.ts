import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import test from "node:test";
import { POST } from "../app/api/preferences/theme/route";
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

test("signed-out visitors can set only a trusted, validated theme cookie", async () => {
  const fixture = {
    AUTH_SECRET: "synthetic-theme-secret-with-at-least-32-characters",
    AUTH_URL: "https://devstash.example.test",
    AUTH_GOOGLE_CLIENT_ID: "fake-google-client",
    AUTH_GOOGLE_CLIENT_SECRET: "fake-google-secret",
    DATABASE_URL: "postgresql://fake:fake@localhost:5432/fake",
  };
  const previous = Object.fromEntries(
    Object.keys(fixture).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, fixture);

  function request(body: string, origin = fixture.AUTH_URL) {
    return new Request(`${fixture.AUTH_URL}/api/preferences/theme`, {
      method: "POST",
      headers: {
        host: "devstash.example.test",
        origin,
        "content-type": "application/json",
      },
      body,
    });
  }

  try {
    const saved = await POST(request(JSON.stringify({ theme: "light" })));
    assert.equal(saved.status, 200);
    assert.deepEqual(await saved.json(), { success: true, data: { theme: "light" } });
    assert.match(saved.headers.get("cache-control") ?? "", /no-store/);
    assert.match(saved.headers.get("set-cookie") ?? "", /devstash-theme=light.*HttpOnly.*SameSite=Lax/i);

    for (const denied of [
      request(JSON.stringify({ theme: "dark" }), "https://attacker.example"),
      request(JSON.stringify({ theme: "dark", ownerId: "attacker" })),
      request(JSON.stringify({ theme: "system" })),
      request("x".repeat(65)),
    ]) {
      const response = await POST(denied);
      assert.ok(response.status === 400 || response.status === 403);
      assert.equal(response.headers.get("set-cookie"), null);
    }
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
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
