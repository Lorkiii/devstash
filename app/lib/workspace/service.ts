import "server-only";

import type { EnvBundleModel } from "@/app/generated/prisma/models/EnvBundle";
import type { NoteModel } from "@/app/generated/prisma/models/Note";
import type { ProjectModel } from "@/app/generated/prisma/models/Project";
import type { TaskModel } from "@/app/generated/prisma/models/Task";
import type { TaskCategoryModel } from "@/app/generated/prisma/models/TaskCategory";
import { getAuthEnvironment } from "../auth/environment";
import { getPrisma } from "../prisma";
import type {
  EnvBundleCiphertext,
  NoteCiphertext,
  ProjectCiphertext,
  TaskCiphertext,
  TaskCategoryCiphertext,
  WorkspaceEnvelope,
} from "../workspace.types";
import { builtInTaskCategoryById, builtInTaskCategoryByKey } from "../task-categories";
import {
  createEnvBundleSchema,
  createNoteSchema,
  createProjectSchema,
  createTaskSchema,
  createTaskCategorySchema,
  type CreateEnvBundleInput,
  type CreateNoteInput,
  type CreateProjectInput,
  type CreateTaskInput,
  type CreateTaskCategoryInput,
  type ReplaceEnvBundleInput,
  type ReplaceNoteInput,
  type ReplaceProjectInput,
  type ReplaceTaskInput,
  type ReplaceTaskCategoryInput,
} from "./validation";

export class WorkspaceConflictError extends Error {
  override readonly name = "WorkspaceConflictError";
}

export class WorkspaceNotFoundError extends Error {
  override readonly name = "WorkspaceNotFoundError";
}

function database() {
  const environment = getAuthEnvironment();
  if (!environment) throw new Error("Application configuration is unavailable.");
  return getPrisma(environment.databaseUrl);
}

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function decodeBytes(value: string): Uint8Array<ArrayBuffer> {
  const decoded = Buffer.from(value, "base64url");
  const bytes = new Uint8Array(decoded.byteLength);
  bytes.set(decoded);
  return bytes;
}

function encodeBytes(value: Uint8Array): string {
  return Buffer.from(value).toString("base64url");
}

function envelopeData(envelope: WorkspaceEnvelope) {
  return {
    envelopeVersion: envelope.envelopeVersion,
    algorithm: envelope.algorithm,
    nonce: decodeBytes(envelope.nonce),
    tagBits: envelope.tagBits,
    ciphertext: decodeBytes(envelope.ciphertext),
  };
}

function storedEnvelope(record: {
  envelopeVersion: number;
  algorithm: string;
  nonce: Uint8Array;
  tagBits: number;
  ciphertext: Uint8Array;
}) {
  return {
    envelopeVersion: record.envelopeVersion,
    algorithm: record.algorithm,
    nonce: encodeBytes(record.nonce),
    tagBits: record.tagBits,
    ciphertext: encodeBytes(record.ciphertext),
  };
}

export function toProjectDto(record: ProjectModel): ProjectCiphertext {
  const parsed = createProjectSchema.safeParse({
    project: { id: record.id, envelope: storedEnvelope(record) },
  });
  if (!parsed.success) throw new Error("Stored project is invalid.");
  return {
    ...parsed.data.project,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toEnvBundleDto(record: EnvBundleModel): EnvBundleCiphertext {
  const parsed = createEnvBundleSchema.safeParse({
    bundle: { id: record.id, projectId: record.projectId, envelope: storedEnvelope(record) },
  });
  if (!parsed.success) throw new Error("Stored environment bundle is invalid.");
  return {
    ...parsed.data.bundle,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toNoteDto(record: NoteModel): NoteCiphertext {
  const parsed = createNoteSchema.safeParse({
    note: { id: record.id, projectId: record.projectId, envelope: storedEnvelope(record) },
  });
  if (!parsed.success) throw new Error("Stored note is invalid.");
  return {
    ...parsed.data.note,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toTaskDto(record: TaskModel): TaskCiphertext {
  const categoryId = storedTaskCategoryId(record);
  const parsed = createTaskSchema.safeParse({
    task: {
      id: record.id,
      projectId: record.projectId,
      categoryId,
      done: record.done,
      sortOrder: record.sortOrder,
      envelope: storedEnvelope(record),
    },
  });
  if (!parsed.success) throw new Error("Stored task is invalid.");
  return {
    ...parsed.data.task,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toTaskCategoryDto(record: TaskCategoryModel): TaskCategoryCiphertext {
  const parsed = createTaskCategorySchema.safeParse({
    category: { id: record.id, envelope: storedEnvelope(record) },
  });
  if (!parsed.success) throw new Error("Stored task category is invalid.");
  return {
    ...parsed.data.category,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function storedTaskCategoryId(record: {
  builtInCategory: string | null;
  customCategoryId: string | null;
}): string | null {
  if (record.builtInCategory && record.customCategoryId) {
    throw new Error("Stored task category relationship is invalid.");
  }
  if (record.customCategoryId) return record.customCategoryId;
  if (!record.builtInCategory) return null;
  const category = builtInTaskCategoryByKey(record.builtInCategory);
  if (!category) throw new Error("Stored built-in task category is invalid.");
  return category.id;
}

async function assertOwnedProject(ownerId: string, projectId: string | null): Promise<void> {
  if (!projectId) return;
  const count = await database().project.count({ where: { id: projectId, ownerId } });
  if (count !== 1) throw new WorkspaceNotFoundError();
}

async function taskCategoryData(ownerId: string, categoryId: string | null) {
  if (!categoryId) return { builtInCategory: null, customCategoryId: null };
  const builtIn = builtInTaskCategoryById(categoryId);
  if (builtIn) return { builtInCategory: builtIn.key, customCategoryId: null };
  const count = await database().taskCategory.count({ where: { id: categoryId, ownerId } });
  if (count !== 1) throw new WorkspaceNotFoundError();
  return { builtInCategory: null, customCategoryId: categoryId };
}

function translateWriteError(error: unknown): never {
  if (isPrismaCode(error, "P2002")) throw new WorkspaceConflictError();
  if (isPrismaCode(error, "P2003")) throw new WorkspaceNotFoundError();
  throw error;
}

export async function findProjects(ownerId: string): Promise<ProjectCiphertext[]> {
  const records = await database().project.findMany({
    where: { ownerId },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  });
  return records.map(toProjectDto);
}

export async function createProject(ownerId: string, input: CreateProjectInput): Promise<ProjectCiphertext> {
  try {
    const record = await database().project.create({
      data: { id: input.project.id, ownerId, ...envelopeData(input.project.envelope) },
    });
    return toProjectDto(record);
  } catch (error) {
    translateWriteError(error);
  }
}

export async function replaceProject(
  ownerId: string,
  id: string,
  input: ReplaceProjectInput,
): Promise<ProjectCiphertext> {
  const records = await database().project.updateManyAndReturn({
    where: { id, ownerId },
    data: envelopeData(input.project.envelope),
  });
  if (records.length !== 1) throw new WorkspaceNotFoundError();
  return toProjectDto(records[0]);
}

export async function deleteProject(ownerId: string, id: string): Promise<void> {
  try {
    const deleted = await database().project.deleteMany({ where: { id, ownerId } });
    if (deleted.count !== 1) throw new WorkspaceNotFoundError();
  } catch (error) {
    if (isPrismaCode(error, "P2003")) throw new WorkspaceConflictError();
    throw error;
  }
}

export async function findEnvBundles(ownerId: string): Promise<EnvBundleCiphertext[]> {
  const records = await database().envBundle.findMany({
    where: { ownerId },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  });
  return records.map(toEnvBundleDto);
}

export async function createEnvBundle(
  ownerId: string,
  input: CreateEnvBundleInput,
): Promise<EnvBundleCiphertext> {
  await assertOwnedProject(ownerId, input.bundle.projectId);
  try {
    const record = await database().envBundle.create({
      data: {
        id: input.bundle.id,
        ownerId,
        projectId: input.bundle.projectId,
        ...envelopeData(input.bundle.envelope),
      },
    });
    return toEnvBundleDto(record);
  } catch (error) {
    translateWriteError(error);
  }
}

export async function replaceEnvBundle(
  ownerId: string,
  id: string,
  input: ReplaceEnvBundleInput,
): Promise<EnvBundleCiphertext> {
  await assertOwnedProject(ownerId, input.bundle.projectId);
  try {
    const records = await database().envBundle.updateManyAndReturn({
      where: { id, ownerId },
      data: { projectId: input.bundle.projectId, ...envelopeData(input.bundle.envelope) },
    });
    if (records.length !== 1) throw new WorkspaceNotFoundError();
    return toEnvBundleDto(records[0]);
  } catch (error) {
    translateWriteError(error);
  }
}

export async function deleteEnvBundle(ownerId: string, id: string): Promise<void> {
  const deleted = await database().envBundle.deleteMany({ where: { id, ownerId } });
  if (deleted.count !== 1) throw new WorkspaceNotFoundError();
}

export async function findNotes(ownerId: string): Promise<NoteCiphertext[]> {
  const records = await database().note.findMany({
    where: { ownerId },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  });
  return records.map(toNoteDto);
}

export async function createNote(ownerId: string, input: CreateNoteInput): Promise<NoteCiphertext> {
  await assertOwnedProject(ownerId, input.note.projectId);
  try {
    const record = await database().note.create({
      data: {
        id: input.note.id,
        ownerId,
        projectId: input.note.projectId,
        ...envelopeData(input.note.envelope),
      },
    });
    return toNoteDto(record);
  } catch (error) {
    translateWriteError(error);
  }
}

export async function replaceNote(
  ownerId: string,
  id: string,
  input: ReplaceNoteInput,
): Promise<NoteCiphertext> {
  await assertOwnedProject(ownerId, input.note.projectId);
  try {
    const records = await database().note.updateManyAndReturn({
      where: { id, ownerId },
      data: { projectId: input.note.projectId, ...envelopeData(input.note.envelope) },
    });
    if (records.length !== 1) throw new WorkspaceNotFoundError();
    return toNoteDto(records[0]);
  } catch (error) {
    translateWriteError(error);
  }
}

export async function deleteNote(ownerId: string, id: string): Promise<void> {
  const deleted = await database().note.deleteMany({ where: { id, ownerId } });
  if (deleted.count !== 1) throw new WorkspaceNotFoundError();
}

export async function findTaskCategories(ownerId: string): Promise<TaskCategoryCiphertext[]> {
  const records = await database().taskCategory.findMany({
    where: { ownerId },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  });
  return records.map(toTaskCategoryDto);
}

export async function createTaskCategory(
  ownerId: string,
  input: CreateTaskCategoryInput,
): Promise<TaskCategoryCiphertext> {
  try {
    const record = await database().taskCategory.create({
      data: { id: input.category.id, ownerId, ...envelopeData(input.category.envelope) },
    });
    return toTaskCategoryDto(record);
  } catch (error) {
    translateWriteError(error);
  }
}

export async function replaceTaskCategory(
  ownerId: string,
  id: string,
  input: ReplaceTaskCategoryInput,
): Promise<TaskCategoryCiphertext> {
  const records = await database().taskCategory.updateManyAndReturn({
    where: { id, ownerId },
    data: envelopeData(input.category.envelope),
  });
  if (records.length !== 1) throw new WorkspaceNotFoundError();
  return toTaskCategoryDto(records[0]);
}

export async function deleteTaskCategory(ownerId: string, id: string): Promise<void> {
  try {
    const deleted = await database().taskCategory.deleteMany({ where: { id, ownerId } });
    if (deleted.count !== 1) throw new WorkspaceNotFoundError();
  } catch (error) {
    if (isPrismaCode(error, "P2003")) throw new WorkspaceConflictError();
    throw error;
  }
}

export async function findTasks(ownerId: string): Promise<TaskCiphertext[]> {
  const records = await database().task.findMany({
    where: { ownerId },
    orderBy: [{ done: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
  });
  return records.map(toTaskDto);
}

export async function createTask(ownerId: string, input: CreateTaskInput): Promise<TaskCiphertext> {
  await assertOwnedProject(ownerId, input.task.projectId);
  const category = await taskCategoryData(ownerId, input.task.categoryId);
  try {
    const record = await database().task.create({
      data: {
        id: input.task.id,
        ownerId,
        projectId: input.task.projectId,
        ...category,
        done: input.task.done,
        sortOrder: input.task.sortOrder,
        ...envelopeData(input.task.envelope),
      },
    });
    return toTaskDto(record);
  } catch (error) {
    translateWriteError(error);
  }
}

export async function replaceTask(
  ownerId: string,
  id: string,
  input: ReplaceTaskInput,
): Promise<TaskCiphertext> {
  await assertOwnedProject(ownerId, input.task.projectId);
  const category = await taskCategoryData(ownerId, input.task.categoryId);
  try {
    const records = await database().task.updateManyAndReturn({
      where: { id, ownerId },
      data: {
        projectId: input.task.projectId,
        ...category,
        done: input.task.done,
        sortOrder: input.task.sortOrder,
        ...envelopeData(input.task.envelope),
      },
    });
    if (records.length !== 1) throw new WorkspaceNotFoundError();
    return toTaskDto(records[0]);
  } catch (error) {
    translateWriteError(error);
  }
}

export async function deleteTask(ownerId: string, id: string): Promise<void> {
  const deleted = await database().task.deleteMany({ where: { id, ownerId } });
  if (deleted.count !== 1) throw new WorkspaceNotFoundError();
}
