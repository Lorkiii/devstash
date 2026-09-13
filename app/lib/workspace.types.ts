export const WORKSPACE_PAYLOAD_VERSION = 1 as const;
export const PROJECT_ENTITY_TYPE = "project" as const;
export const ENV_BUNDLE_ENTITY_TYPE = "env-bundle" as const;
export const NOTE_ENTITY_TYPE = "note" as const;
export const TASK_ENTITY_TYPE = "task" as const;
export const TASK_CATEGORY_ENTITY_TYPE = "task-category" as const;

export const WORKSPACE_PLAINTEXT_LIMITS = {
  project: 16_384,
  envBundle: 131_072,
  note: 131_072,
  task: 32_768,
  taskCategory: 4_096,
} as const;

export const WORKSPACE_CIPHERTEXT_LIMITS = {
  project: WORKSPACE_PLAINTEXT_LIMITS.project + 16,
  envBundle: WORKSPACE_PLAINTEXT_LIMITS.envBundle + 16,
  note: WORKSPACE_PLAINTEXT_LIMITS.note + 16,
  task: WORKSPACE_PLAINTEXT_LIMITS.task + 16,
  taskCategory: WORKSPACE_PLAINTEXT_LIMITS.taskCategory + 16,
} as const;

export const WORKSPACE_FIELD_LIMITS = {
  titleCodePoints: 200,
  descriptionCodePoints: 8_192,
  environmentCodePoints: 128,
  envContentCodePoints: 120_000,
  noteBodyCodePoints: 120_000,
  tagCount: 20,
  tagCodePoints: 64,
  maximumSortOrder: 1_000_000,
  categoryNameCodePoints: 80,
} as const;

export interface WorkspaceEnvelope {
  envelopeVersion: 1;
  algorithm: "AES-256-GCM";
  nonce: string;
  tagBits: 128;
  ciphertext: string;
}

export interface ProjectInput {
  name: string;
  description: string;
}

export interface EnvBundleInput {
  projectId: string;
  environment: string;
  content: string;
}

export interface NoteInput {
  projectId: string | null;
  title: string;
  body: string;
  tags: string[];
}

export interface TaskInput {
  projectId: string | null;
  categoryId: string | null;
  title: string;
  description: string | null;
  dueDate: string | null;
  done: boolean;
  sortOrder: number;
}

export interface TaskCategoryInput {
  name: string;
  colorToken: TaskCategoryColorToken;
}

export interface ProjectCiphertext {
  id: string;
  envelope: WorkspaceEnvelope;
  createdAt: string;
  updatedAt: string;
}

export interface EnvBundleCiphertext extends ProjectCiphertext {
  projectId: string;
}

export interface NoteCiphertext extends ProjectCiphertext {
  projectId: string | null;
}

export interface TaskCiphertext extends NoteCiphertext {
  categoryId: string | null;
  done: boolean;
  sortOrder: number;
}

export type TaskCategoryCiphertext = ProjectCiphertext;

export type NewProjectCiphertext = Omit<ProjectCiphertext, "createdAt" | "updatedAt">;
export type ReplaceProjectCiphertext = Omit<NewProjectCiphertext, "id">;
export type NewEnvBundleCiphertext = Omit<EnvBundleCiphertext, "createdAt" | "updatedAt">;
export type ReplaceEnvBundleCiphertext = Omit<NewEnvBundleCiphertext, "id">;
export type NewNoteCiphertext = Omit<NoteCiphertext, "createdAt" | "updatedAt">;
export type ReplaceNoteCiphertext = Omit<NewNoteCiphertext, "id">;
export type NewTaskCiphertext = Omit<TaskCiphertext, "createdAt" | "updatedAt">;
export type ReplaceTaskCiphertext = Omit<NewTaskCiphertext, "id">;
export type NewTaskCategoryCiphertext = Omit<TaskCategoryCiphertext, "createdAt" | "updatedAt">;
export type ReplaceTaskCategoryCiphertext = Omit<NewTaskCategoryCiphertext, "id">;
import type { TaskCategoryColorToken } from "./vault-data.types";
