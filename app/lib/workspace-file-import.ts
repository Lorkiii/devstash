import "client-only";

import { WORKSPACE_FIELD_LIMITS } from "./workspace.types";

export const WORKSPACE_IMPORT_MAX_BYTES = 120_000;
export const ENV_IMPORT_MAX_ROWS = 1_000;
export const ENV_IMPORT_KEY_MAX_CODE_POINTS = 256;

export type WorkspaceFileImportErrorCode =
  | "empty-file"
  | "file-too-large"
  | "invalid-utf8"
  | "read-failed"
  | "unsupported-filename"
  | "derived-name-too-long"
  | "no-env-variables"
  | "too-many-env-rows"
  | "invalid-env-rows"
  | "serialized-env-too-large";

export class WorkspaceFileImportError extends Error {
  readonly code: WorkspaceFileImportErrorCode;

  constructor(code: WorkspaceFileImportErrorCode, message: string) {
    super(message);
    this.name = "WorkspaceFileImportError";
    this.code = code;
  }
}

export interface WorkspaceImportFile {
  readonly name: string;
  readonly size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export type EnvImportRowIssueCode =
  | "missing-assignment"
  | "unterminated-quote"
  | "unexpected-after-quote"
  | "invalid-key"
  | "duplicate-key";

export interface EnvImportRowIssue {
  code: EnvImportRowIssueCode;
  message: string;
}

export interface EnvImportRow {
  rowId: number;
  sourceLine: number | null;
  key: string;
  value: string;
  issue: EnvImportRowIssue | null;
}

export interface EnvImportDraft {
  environment: string;
  rows: EnvImportRow[];
  skippedLineCount: number;
}

export interface EnvImportParseResult {
  rows: EnvImportRow[];
  skippedLineCount: number;
}

export interface NoteImportDraft {
  title: string;
  body: string;
  tags: string[];
}

function codePointLength(value: string): number {
  return Array.from(value).length;
}

function rowIssue(code: EnvImportRowIssueCode, message: string): EnvImportRowIssue {
  return { code, message };
}

function isStructuralIssue(issue: EnvImportRowIssue | null): boolean {
  return issue?.code === "missing-assignment" ||
    issue?.code === "unterminated-quote" ||
    issue?.code === "unexpected-after-quote";
}

function physicalLines(source: string): string[] {
  const lines = source.split(/\r\n|\n|\r/u);
  if (/\r\n$|[\n\r]$/u.test(source)) lines.pop();
  return lines;
}

function decodeQuotedValue(value: string, quote: "\"" | "'"): string {
  let decoded = "";
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character !== "\\" || index + 1 >= value.length) {
      decoded += character;
      continue;
    }

    const escaped = value[index + 1];
    if (quote === "'") {
      if (escaped === "'" || escaped === "\\") {
        decoded += escaped;
        index += 1;
      } else {
        decoded += `\\${escaped}`;
        index += 1;
      }
      continue;
    }

    const replacements: Record<string, string> = {
      "\\": "\\",
      "\"": "\"",
      n: "\n",
      r: "\r",
      t: "\t",
    };
    if (escaped in replacements) {
      decoded += replacements[escaped];
      index += 1;
    } else {
      decoded += `\\${escaped}`;
      index += 1;
    }
  }
  return decoded;
}

function parseQuotedValue(source: string): Pick<EnvImportRow, "value" | "issue"> {
  const quote = source[0] as "\"" | "'";
  let escaped = false;
  let closingIndex = -1;

  for (let index = 1; index < source.length; index += 1) {
    const character = source[index];
    if (character === quote && !escaped) {
      closingIndex = index;
      break;
    }
    if (character === "\\" && !escaped) escaped = true;
    else escaped = false;
  }

  if (closingIndex < 0) {
    return {
      value: decodeQuotedValue(source.slice(1), quote),
      issue: rowIssue(
        "unterminated-quote",
        "Quoted values must open and close on the same line.",
      ),
    };
  }

  const remainder = source.slice(closingIndex + 1).trim();
  return {
    value: decodeQuotedValue(source.slice(1, closingIndex), quote),
    issue: remainder.length > 0 && !remainder.startsWith("#")
      ? rowIssue(
        "unexpected-after-quote",
        "Remove the unexpected text after the closing quote or move it into the value.",
      )
      : null,
  };
}

function parseUnquotedValue(source: string): string {
  const commentIndex = source.indexOf("#");
  return (commentIndex < 0 ? source : source.slice(0, commentIndex)).trim();
}

function parseEnvRow(line: string, sourceLine: number, rowId: number): EnvImportRow {
  const exportMatch = /^\s*export\s+([\s\S]*)$/u.exec(line);
  const assignment = exportMatch?.[1] ?? line.trimStart();
  const equalsIndex = assignment.indexOf("=");

  if (equalsIndex < 0) {
    return {
      rowId,
      sourceLine,
      key: assignment.trim(),
      value: "",
      issue: rowIssue("missing-assignment", "Add an equals sign and a value, or remove this row."),
    };
  }

  const key = assignment.slice(0, equalsIndex).trim();
  const valueSource = assignment.slice(equalsIndex + 1).trimStart();
  const parsedValue = valueSource.startsWith("\"") || valueSource.startsWith("'")
    ? parseQuotedValue(valueSource)
    : { value: parseUnquotedValue(valueSource), issue: null };

  return { rowId, sourceLine, key, ...parsedValue };
}

export function validateEnvImportRows(rows: readonly EnvImportRow[]): EnvImportRow[] {
  const duplicateCounts = new Map<string, number>();
  for (const row of rows) {
    if (row.key.length > 0) {
      duplicateCounts.set(row.key, (duplicateCounts.get(row.key) ?? 0) + 1);
    }
  }

  return rows.map((row) => {
    let issue = isStructuralIssue(row.issue) ? row.issue : null;
    if (!issue && (!/^[A-Za-z0-9_]+$/u.test(row.key) || codePointLength(row.key) > ENV_IMPORT_KEY_MAX_CODE_POINTS)) {
      issue = rowIssue(
        "invalid-key",
        `Keys must contain only letters, digits, or underscores and be at most ${ENV_IMPORT_KEY_MAX_CODE_POINTS} characters.`,
      );
    }
    if (!issue && (duplicateCounts.get(row.key) ?? 0) > 1) {
      issue = rowIssue("duplicate-key", "This key is duplicated. Rename or remove one of the matching rows.");
    }
    return { ...row, issue };
  });
}

export function parseEnvSource(source: string): EnvImportParseResult {
  const rows: EnvImportRow[] = [];
  let skippedLineCount = 0;

  for (const [index, line] of physicalLines(source).entries()) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      skippedLineCount += 1;
      continue;
    }
    if (rows.length >= ENV_IMPORT_MAX_ROWS) {
      throw new WorkspaceFileImportError(
        "too-many-env-rows",
        `Choose a file with no more than ${ENV_IMPORT_MAX_ROWS.toLocaleString("en-US")} variable rows.`,
      );
    }
    rows.push(parseEnvRow(line, index + 1, rows.length + 1));
  }

  return { rows: validateEnvImportRows(rows), skippedLineCount };
}

function serializeEnvValue(value: string): string {
  if (!/[\s#"'\\]/u.test(value)) return value;
  return `"${value
    .replaceAll("\\", "\\\\")
    .replaceAll("\"", "\\\"")
    .replaceAll("\r", "\\r")
    .replaceAll("\n", "\\n")
    .replaceAll("\t", "\\t")}"`;
}

export function serializeEnvImportRows(rows: readonly EnvImportRow[]): string {
  const validatedRows = validateEnvImportRows(rows);
  if (validatedRows.length === 0 || validatedRows.some((row) => row.issue)) {
    throw new WorkspaceFileImportError(
      "invalid-env-rows",
      "Correct or remove every invalid variable row before creating the bundle.",
    );
  }

  const content = `${validatedRows
    .map((row) => `${row.key}=${serializeEnvValue(row.value)}`)
    .join("\n")}\n`;
  if (new TextEncoder().encode(content).byteLength > WORKSPACE_IMPORT_MAX_BYTES) {
    throw new WorkspaceFileImportError(
      "serialized-env-too-large",
      "The reviewed variables exceed the 120,000-byte bundle limit after safe serialization.",
    );
  }
  return content;
}

function assertImportSize(file: WorkspaceImportFile): void {
  if (file.size <= 0) {
    throw new WorkspaceFileImportError("empty-file", "Choose a non-empty file.");
  }
  if (file.size > WORKSPACE_IMPORT_MAX_BYTES) {
    throw new WorkspaceFileImportError(
      "file-too-large",
      "Choose a file no larger than 120,000 bytes.",
    );
  }
}

async function readUtf8Source(file: WorkspaceImportFile): Promise<string> {
  assertImportSize(file);

  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new WorkspaceFileImportError("read-failed", "The selected file could not be read.");
  }

  const bytes = new Uint8Array(buffer);
  try {
    if (bytes.byteLength === 0) {
      throw new WorkspaceFileImportError("empty-file", "Choose a non-empty file.");
    }
    if (bytes.byteLength > WORKSPACE_IMPORT_MAX_BYTES) {
      throw new WorkspaceFileImportError(
        "file-too-large",
        "Choose a file no larger than 120,000 bytes.",
      );
    }

    try {
      return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    } catch {
      throw new WorkspaceFileImportError(
        "invalid-utf8",
        "The selected file must contain valid UTF-8 text.",
      );
    }
  } finally {
    bytes.fill(0);
  }
}

function deriveEnvironment(filename: string): string {
  const match = /^\.env(?:\.(.+))?$/iu.exec(filename);
  if (!match) {
    throw new WorkspaceFileImportError(
      "unsupported-filename",
      "Choose a file named .env or .env.<environment>.",
    );
  }

  const environment = match[1] ?? "default";
  if (environment.trim().length === 0) {
    throw new WorkspaceFileImportError(
      "unsupported-filename",
      "Choose a file named .env or .env.<environment>.",
    );
  }
  if (codePointLength(environment) > WORKSPACE_FIELD_LIMITS.environmentCodePoints) {
    throw new WorkspaceFileImportError(
      "derived-name-too-long",
      `The environment name from the filename must be at most ${WORKSPACE_FIELD_LIMITS.environmentCodePoints} characters.`,
    );
  }
  return environment;
}

function deriveNoteTitle(filename: string): string {
  const match = /^(.+)\.(?:md|markdown)$/iu.exec(filename);
  if (!match || match[1].trim().length === 0) {
    throw new WorkspaceFileImportError(
      "unsupported-filename",
      "Choose a .md or .markdown file with a title in its filename.",
    );
  }

  const title = match[1];
  if (codePointLength(title) > WORKSPACE_FIELD_LIMITS.titleCodePoints) {
    throw new WorkspaceFileImportError(
      "derived-name-too-long",
      `The note title from the filename must be at most ${WORKSPACE_FIELD_LIMITS.titleCodePoints} characters.`,
    );
  }
  return title;
}

export async function readEnvImportFile(file: WorkspaceImportFile): Promise<EnvImportDraft> {
  const environment = deriveEnvironment(file.name);
  let source = await readUtf8Source(file);
  try {
    if (source.charCodeAt(0) === 0xfeff) source = source.slice(1);
    const parsed = parseEnvSource(source);
    if (parsed.rows.length === 0) {
      throw new WorkspaceFileImportError(
        "no-env-variables",
        "The selected file does not contain any variable rows to review.",
      );
    }
    return { environment, ...parsed };
  } finally {
    source = "";
  }
}

export async function readMarkdownImportFile(file: WorkspaceImportFile): Promise<NoteImportDraft> {
  const title = deriveNoteTitle(file.name);
  const body = await readUtf8Source(file);
  return { title, body, tags: [] };
}

export function clearEnvImportDraft(draft: EnvImportDraft | null | undefined): void {
  if (!draft) return;
  draft.environment = "";
  for (const row of draft.rows) {
    row.key = "";
    row.value = "";
    row.issue = null;
    row.sourceLine = null;
  }
  draft.rows.length = 0;
  draft.skippedLineCount = 0;
}

export function clearNoteImportDraft(draft: NoteImportDraft | null | undefined): void {
  if (!draft) return;
  draft.title = "";
  draft.body = "";
  draft.tags.length = 0;
}
