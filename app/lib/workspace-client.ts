import "client-only";

import {
  WORKSPACE_CIPHERTEXT_LIMITS,
  WORKSPACE_FIELD_LIMITS,
  type EnvBundleCiphertext,
  type NewEnvBundleCiphertext,
  type NewNoteCiphertext,
  type NewProjectCiphertext,
  type NewTaskCiphertext,
  type NewTaskCategoryCiphertext,
  type NoteCiphertext,
  type ProjectCiphertext,
  type ReplaceEnvBundleCiphertext,
  type ReplaceNoteCiphertext,
  type ReplaceProjectCiphertext,
  type ReplaceTaskCiphertext,
  type ReplaceTaskCategoryCiphertext,
  type TaskCiphertext,
  type TaskCategoryCiphertext,
  type WorkspaceEnvelope,
} from "./workspace.types";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;

export class WorkspaceRequestError extends Error {
  override readonly name = "WorkspaceRequestError";
  constructor(readonly status: number) {
    super("Workspace request failed.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return keys.length === sortedExpected.length &&
    keys.every((key, index) => key === sortedExpected[index]);
}

function parseId(value: unknown): string {
  if (typeof value !== "string" || !UUID_V4_PATTERN.test(value)) throw new WorkspaceRequestError(500);
  return value;
}

function parseTimestamp(value: unknown): string {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new WorkspaceRequestError(500);
  }
  return value;
}

function parseEnvelope(value: unknown, maximumBytes: number): WorkspaceEnvelope {
  if (!isRecord(value) || !hasExactKeys(value, [
    "envelopeVersion",
    "algorithm",
    "nonce",
    "tagBits",
    "ciphertext",
  ])) {
    throw new WorkspaceRequestError(500);
  }
  const maximumCharacters = Math.ceil(maximumBytes * 4 / 3);
  if (
    value.envelopeVersion !== 1 ||
    value.algorithm !== "AES-256-GCM" ||
    value.tagBits !== 128 ||
    typeof value.nonce !== "string" ||
    value.nonce.length !== 16 ||
    !BASE64URL_PATTERN.test(value.nonce) ||
    typeof value.ciphertext !== "string" ||
    value.ciphertext.length < 22 ||
    value.ciphertext.length > maximumCharacters ||
    value.ciphertext.length % 4 === 1 ||
    !BASE64URL_PATTERN.test(value.ciphertext)
  ) {
    throw new WorkspaceRequestError(500);
  }
  return {
    envelopeVersion: 1,
    algorithm: "AES-256-GCM",
    nonce: value.nonce,
    tagBits: 128,
    ciphertext: value.ciphertext,
  };
}

function parseBase(
  value: Record<string, unknown>,
  maximumBytes: number,
): ProjectCiphertext {
  return {
    id: parseId(value.id),
    envelope: parseEnvelope(value.envelope, maximumBytes),
    createdAt: parseTimestamp(value.createdAt),
    updatedAt: parseTimestamp(value.updatedAt),
  };
}

function parseProject(value: unknown): ProjectCiphertext {
  if (!isRecord(value) || !hasExactKeys(value, ["id", "envelope", "createdAt", "updatedAt"])) {
    throw new WorkspaceRequestError(500);
  }
  return parseBase(value, WORKSPACE_CIPHERTEXT_LIMITS.project);
}

function parseEnvBundle(value: unknown): EnvBundleCiphertext {
  if (!isRecord(value) || !hasExactKeys(value, ["id", "projectId", "envelope", "createdAt", "updatedAt"])) {
    throw new WorkspaceRequestError(500);
  }
  return { ...parseBase(value, WORKSPACE_CIPHERTEXT_LIMITS.envBundle), projectId: parseId(value.projectId) };
}

function parseNote(value: unknown): NoteCiphertext {
  if (!isRecord(value) || !hasExactKeys(value, ["id", "projectId", "envelope", "createdAt", "updatedAt"])) {
    throw new WorkspaceRequestError(500);
  }
  return {
    ...parseBase(value, WORKSPACE_CIPHERTEXT_LIMITS.note),
    projectId: value.projectId === null ? null : parseId(value.projectId),
  };
}

function parseTask(value: unknown): TaskCiphertext {
  if (!isRecord(value) || !hasExactKeys(value, [
    "id",
    "projectId",
    "categoryId",
    "done",
    "sortOrder",
    "envelope",
    "createdAt",
    "updatedAt",
  ])) {
    throw new WorkspaceRequestError(500);
  }
  if (
    typeof value.done !== "boolean" ||
    typeof value.sortOrder !== "number" ||
    !Number.isSafeInteger(value.sortOrder) ||
    value.sortOrder < 0 ||
    value.sortOrder > WORKSPACE_FIELD_LIMITS.maximumSortOrder
  ) {
    throw new WorkspaceRequestError(500);
  }
  return {
    ...parseBase(value, WORKSPACE_CIPHERTEXT_LIMITS.task),
    projectId: value.projectId === null ? null : parseId(value.projectId),
    categoryId: value.categoryId === null ? null : parseId(value.categoryId),
    done: value.done,
    sortOrder: value.sortOrder,
  };
}

function parseTaskCategory(value: unknown): TaskCategoryCiphertext {
  if (!isRecord(value) || !hasExactKeys(value, ["id", "envelope", "createdAt", "updatedAt"])) {
    throw new WorkspaceRequestError(500);
  }
  return parseBase(value, WORKSPACE_CIPHERTEXT_LIMITS.taskCategory);
}

function isSuccess(value: unknown): value is { success: true; data: unknown } {
  return isRecord(value) &&
    hasExactKeys(value, ["success", "data"]) &&
    value.success === true;
}

async function readResponse(response: Response): Promise<unknown> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new WorkspaceRequestError(response.status || 500);
  }
  if (!response.ok || !isSuccess(payload)) throw new WorkspaceRequestError(response.status || 500);
  return payload.data;
}

async function list<T>(path: string, parse: (value: unknown) => T, signal?: AbortSignal): Promise<T[]> {
  const response = await fetch(path, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  const data = await readResponse(response);
  if (!Array.isArray(data)) throw new WorkspaceRequestError(500);
  return data.map(parse);
}

async function mutate<T>(
  path: string,
  method: "POST" | "PATCH",
  body: unknown,
  parse: (value: unknown) => T,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  return parse(await readResponse(response));
}

async function remove(path: string, id: string, signal?: AbortSignal): Promise<void> {
  const response = await fetch(path, {
    method: "DELETE",
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  const data = await readResponse(response);
  if (!isRecord(data) || !hasExactKeys(data, ["id"]) || data.id !== id) {
    throw new WorkspaceRequestError(500);
  }
}

export const fetchProjects = (signal?: AbortSignal) => list("/api/projects", parseProject, signal);
export const fetchEnvBundles = (signal?: AbortSignal) => list("/api/env-bundles", parseEnvBundle, signal);
export const fetchNotes = (signal?: AbortSignal) => list("/api/notes", parseNote, signal);
export const fetchTasks = (signal?: AbortSignal) => list("/api/tasks", parseTask, signal);
export const fetchTaskCategories = (signal?: AbortSignal) =>
  list("/api/task-categories", parseTaskCategory, signal);

export const createProjectRecord = (project: NewProjectCiphertext, signal?: AbortSignal) =>
  mutate("/api/projects", "POST", { project }, parseProject, signal);
export const replaceProjectRecord = (id: string, project: ReplaceProjectCiphertext, signal?: AbortSignal) =>
  mutate(`/api/projects/${encodeURIComponent(id)}`, "PATCH", { project }, parseProject, signal);
export const removeProjectRecord = (id: string, signal?: AbortSignal) =>
  remove(`/api/projects/${encodeURIComponent(id)}`, id, signal);

export const createEnvBundleRecord = (bundle: NewEnvBundleCiphertext, signal?: AbortSignal) =>
  mutate("/api/env-bundles", "POST", { bundle }, parseEnvBundle, signal);
export const replaceEnvBundleRecord = (id: string, bundle: ReplaceEnvBundleCiphertext, signal?: AbortSignal) =>
  mutate(`/api/env-bundles/${encodeURIComponent(id)}`, "PATCH", { bundle }, parseEnvBundle, signal);
export const removeEnvBundleRecord = (id: string, signal?: AbortSignal) =>
  remove(`/api/env-bundles/${encodeURIComponent(id)}`, id, signal);

export const createNoteRecord = (note: NewNoteCiphertext, signal?: AbortSignal) =>
  mutate("/api/notes", "POST", { note }, parseNote, signal);
export const replaceNoteRecord = (id: string, note: ReplaceNoteCiphertext, signal?: AbortSignal) =>
  mutate(`/api/notes/${encodeURIComponent(id)}`, "PATCH", { note }, parseNote, signal);
export const removeNoteRecord = (id: string, signal?: AbortSignal) =>
  remove(`/api/notes/${encodeURIComponent(id)}`, id, signal);

export const createTaskRecord = (task: NewTaskCiphertext, signal?: AbortSignal) =>
  mutate("/api/tasks", "POST", { task }, parseTask, signal);
export const replaceTaskRecord = (id: string, task: ReplaceTaskCiphertext, signal?: AbortSignal) =>
  mutate(`/api/tasks/${encodeURIComponent(id)}`, "PATCH", { task }, parseTask, signal);
export const removeTaskRecord = (id: string, signal?: AbortSignal) =>
  remove(`/api/tasks/${encodeURIComponent(id)}`, id, signal);

export const createTaskCategoryRecord = (
  category: NewTaskCategoryCiphertext,
  signal?: AbortSignal,
) => mutate("/api/task-categories", "POST", { category }, parseTaskCategory, signal);
export const replaceTaskCategoryRecord = (
  id: string,
  category: ReplaceTaskCategoryCiphertext,
  signal?: AbortSignal,
) => mutate(
  `/api/task-categories/${encodeURIComponent(id)}`,
  "PATCH",
  { category },
  parseTaskCategory,
  signal,
);
export const removeTaskCategoryRecord = (id: string, signal?: AbortSignal) =>
  remove(`/api/task-categories/${encodeURIComponent(id)}`, id, signal);
