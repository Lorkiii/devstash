import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import test from "node:test";

const applicationRoot = join(process.cwd(), "app");

async function applicationSources(directory = applicationRoot): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "generated" ? [] : applicationSources(path);
    }
    return [".ts", ".tsx"].includes(extname(path)) ? [path] : [];
  }));
  return nested.flat();
}

test("application source contains no HTML injection or runtime inline-style sink", async () => {
  const prohibited = [
    /dangerouslySetInnerHTML/u,
    /\.innerHTML\b/u,
    /\.outerHTML\b/u,
    /insertAdjacentHTML/u,
    /document\.write\s*\(/u,
    /\beval\s*\(/u,
    /new\s+Function\s*\(/u,
    /\bstyle\s*=/u,
    /\.style\./u,
  ];

  for (const path of await applicationSources()) {
    const source = await readFile(path, "utf8");
    for (const pattern of prohibited) {
      assert.doesNotMatch(source, pattern, `${relative(process.cwd(), path)} matched ${pattern}`);
    }
  }
});

test("application code does not log private runtime values or use persistent browser storage", async () => {
  for (const path of await applicationSources()) {
    const source = await readFile(path, "utf8");
    assert.doesNotMatch(source, /console\.(?:debug|error|info|log|warn)\s*\(/u, relative(process.cwd(), path));
    if (path.includes(`${join("app", "lib")}`)) {
      assert.doesNotMatch(
        source,
        /\b(?:localStorage|sessionStorage|indexedDB|CacheStorage)\b|\bcaches\s*\./u,
        relative(process.cwd(), path),
      );
    }
  }
});

test("application imports Zod through its CSP setup module", async () => {
  const setupPath = join(applicationRoot, "lib", "validation", "zod.ts");
  const directZodImport = /\b(?:from\s*|import\s*(?:\(\s*)?|require\s*\(\s*)["']zod(?:\/[^"']*)?["']/u;

  for (const path of await applicationSources()) {
    if (path === setupPath) continue;
    const source = await readFile(path, "utf8");
    assert.doesNotMatch(source, directZodImport, `${relative(process.cwd(), path)} bypasses Zod CSP setup`);
  }
});
