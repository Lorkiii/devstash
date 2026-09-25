import assert from "node:assert/strict";
import test from "node:test";
import {
  ENV_IMPORT_KEY_MAX_CODE_POINTS,
  ENV_IMPORT_MAX_ROWS,
  WORKSPACE_IMPORT_MAX_BYTES,
  WorkspaceFileImportError,
  clearEnvImportDraft,
  parseEnvSource,
  readEnvImportFile,
  readMarkdownImportFile,
  serializeEnvImportRows,
  validateEnvImportRows,
  type EnvImportRow,
  type WorkspaceFileImportErrorCode,
  type WorkspaceImportFile,
} from "../app/lib/workspace-file-import";

function assertImportError(code: WorkspaceFileImportErrorCode) {
  return (error: unknown) => error instanceof WorkspaceFileImportError && error.code === code;
}

function row(rowId: number, key: string, value: string): EnvImportRow {
  return { rowId, sourceLine: rowId, key, value, issue: null };
}

function rowValues(rows: readonly EnvImportRow[]) {
  return rows.map(({ sourceLine, key, value, issue }) => ({
    sourceLine,
    key,
    value,
    issue: issue?.code ?? null,
  }));
}

test("environment imports parse common dotenv rows and omit comments and blanks", async () => {
  const source = [
    "# synthetic fixture",
    "",
    " export FIRST = alpha=beta # inline comment",
    "EMPTY=",
    "QUOTED = \" spaced # value \"",
    "SINGLE='日本語'",
    "UNICODE=🔐",
    "",
  ].join("\r\n");

  const draft = await readEnvImportFile(new File([source], ".ENV.production.local"));
  assert.equal(draft.environment, "production.local");
  assert.equal(draft.skippedLineCount, 2);
  assert.deepEqual(rowValues(draft.rows), [
    { sourceLine: 3, key: "FIRST", value: "alpha=beta", issue: null },
    { sourceLine: 4, key: "EMPTY", value: "", issue: null },
    { sourceLine: 5, key: "QUOTED", value: " spaced # value ", issue: null },
    { sourceLine: 6, key: "SINGLE", value: "日本語", issue: null },
    { sourceLine: 7, key: "UNICODE", value: "🔐", issue: null },
  ]);

  const defaultDraft = await readEnvImportFile(new File(["SAFE=fake\n"], ".env"));
  assert.equal(defaultDraft.environment, "default");
});

test("environment serialization preserves order and safely round-trips special values", () => {
  const rows = [
    row(1, "PLAIN", "alpha=beta"),
    row(2, "EMPTY", ""),
    row(3, "SPACED", "two words"),
    row(4, "COMMENT", "value#part"),
    row(5, "QUOTES", "say \"hi\" and 'bye'"),
    row(6, "PATH", "C:\\temp\\file"),
    row(7, "LINES", "first\nsecond\r\nthird\tend"),
    row(8, "UNICODE", "こんにちは🔐"),
  ];

  const serialized = serializeEnvImportRows(rows);
  assert.equal(serialized, [
    "PLAIN=alpha=beta",
    "EMPTY=",
    'SPACED="two words"',
    'COMMENT="value#part"',
    'QUOTES="say \\"hi\\" and \'bye\'"',
    'PATH="C:\\\\temp\\\\file"',
    'LINES="first\\nsecond\\r\\nthird\\tend"',
    "UNICODE=こんにちは🔐",
    "",
  ].join("\n"));

  const reparsed = parseEnvSource(serialized);
  assert.deepEqual(
    reparsed.rows.map(({ key, value, issue }) => ({ key, value, issue })),
    rows.map(({ key, value }) => ({ key, value, issue: null })),
  );
});

test("malformed rows, invalid keys, multiline quotes, and case-sensitive duplicates are reported inline", () => {
  const oversizedKey = "K".repeat(ENV_IMPORT_KEY_MAX_CODE_POINTS + 1);
  const parsed = parseEnvSource([
    "BROKEN",
    "BAD-KEY=value",
    "DUP=one",
    "DUP=two",
    "dup=case-sensitive",
    `${oversizedKey}=large`,
    'MULTI="first',
    'second"',
    'TRAILING="ok" unexpected',
  ].join("\n"));

  assert.deepEqual(parsed.rows.map((entry) => entry.issue?.code ?? null), [
    "missing-assignment",
    "invalid-key",
    "duplicate-key",
    "duplicate-key",
    null,
    "invalid-key",
    "unterminated-quote",
    "missing-assignment",
    "unexpected-after-quote",
  ]);

  const corrected = parsed.rows.map((entry) => ({ ...entry }));
  corrected[0] = { ...corrected[0], key: "BROKEN", value: "fixed", issue: null };
  corrected[1] = { ...corrected[1], key: "GOOD_KEY", issue: null };
  corrected[3] = { ...corrected[3], key: "DUP_TWO", issue: null };
  assert.equal(validateEnvImportRows(corrected)[2].issue, null);
});

test("environment imports reject empty-variable and over-row-limit files", async () => {
  await assert.rejects(
    () => readEnvImportFile(new File(["# only a comment\r\n\r\n"], ".env")),
    assertImportError("no-env-variables"),
  );

  const tooManyRows = Array.from(
    { length: ENV_IMPORT_MAX_ROWS + 1 },
    (_, index) => `KEY_${index}=value`,
  ).join("\n");
  await assert.rejects(
    () => readEnvImportFile(new File([tooManyRows], ".env.large")),
    assertImportError("too-many-env-rows"),
  );
});

test("environment serialization rejects invalid rows and byte-oversized Unicode output", () => {
  assert.throws(
    () => serializeEnvImportRows([row(1, "BAD-KEY", "value")]),
    assertImportError("invalid-env-rows"),
  );
  assert.throws(
    () => serializeEnvImportRows([row(1, "UNICODE", "界".repeat(WORKSPACE_IMPORT_MAX_BYTES / 3))]),
    assertImportError("serialized-env-too-large"),
  );
});

test("clearing an environment import removes every retained key and value reference", async () => {
  const draft = await readEnvImportFile(new File(["FIRST=fake\nSECOND=secret\n"], ".env.test"));
  const originalRows = [...draft.rows];
  clearEnvImportDraft(draft);

  assert.equal(draft.environment, "");
  assert.equal(draft.skippedLineCount, 0);
  assert.equal(draft.rows.length, 0);
  assert.deepEqual(originalRows.map(({ key, value, issue, sourceLine }) => ({ key, value, issue, sourceLine })), [
    { key: "", value: "", issue: null, sourceLine: null },
    { key: "", value: "", issue: null, sourceLine: null },
  ]);
});

test("Markdown imports derive titles, preserve source, and begin without tags", async () => {
  const markdownSource = "# Heading\r\n\r\n<div>source only</div>\r\nこんにちは\r\n";
  assert.deepEqual(
    await readMarkdownImportFile(new File([markdownSource], "release-notes.MD")),
    { title: "release-notes", body: markdownSource, tags: [] },
  );
  assert.deepEqual(
    await readMarkdownImportFile(new File(["Line one\nLine two\n"], "architecture.markdown")),
    { title: "architecture", body: "Line one\nLine two\n", tags: [] },
  );
});

test("imports reject empty, oversized, and unsupported files", async () => {
  await assert.rejects(
    () => readEnvImportFile(new File([], ".env")),
    assertImportError("empty-file"),
  );
  await assert.rejects(
    () => readMarkdownImportFile(new File([new Uint8Array(WORKSPACE_IMPORT_MAX_BYTES + 1)], "large.md")),
    assertImportError("file-too-large"),
  );
  await assert.rejects(
    () => readEnvImportFile(new File(["SAFE=fake"], "environment.txt")),
    assertImportError("unsupported-filename"),
  );
  await assert.rejects(
    () => readMarkdownImportFile(new File(["# Source"], "notes.txt")),
    assertImportError("unsupported-filename"),
  );
});

test("imports reject derived environment names and note titles above existing limits", async () => {
  await assert.rejects(
    () => readEnvImportFile(new File(["SAFE=fake"], `.env.${"e".repeat(129)}`)),
    assertImportError("derived-name-too-long"),
  );
  await assert.rejects(
    () => readMarkdownImportFile(new File(["# Source"], `${"n".repeat(201)}.md`)),
    assertImportError("derived-name-too-long"),
  );
});

test("malformed UTF-8 is rejected and the temporary byte buffer is cleared", async () => {
  const buffer = Uint8Array.from([0xc3, 0x28]).buffer;
  const file: WorkspaceImportFile = {
    name: ".env",
    size: buffer.byteLength,
    async arrayBuffer() {
      return buffer;
    },
  };

  await assert.rejects(() => readEnvImportFile(file), assertImportError("invalid-utf8"));
  assert.deepEqual(Array.from(new Uint8Array(buffer)), [0, 0]);
});
