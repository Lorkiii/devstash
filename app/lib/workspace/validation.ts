import "server-only";

import { z } from "zod";
import {
  WORKSPACE_CIPHERTEXT_LIMITS,
  WORKSPACE_FIELD_LIMITS,
} from "../workspace.types";
import { builtInTaskCategoryById } from "../task-categories";

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

function encodedBytes(minimumLength: number, maximumLength: number) {
  return z.string()
    .max(Math.ceil(maximumLength * 4 / 3))
    .superRefine((value, context) => {
      if (!BASE64URL_PATTERN.test(value) || value.includes("=") || value.length % 4 === 1) {
        context.addIssue({ code: "custom", message: "Invalid binary encoding." });
        return;
      }
      const bytes = Buffer.from(value, "base64url");
      if (
        bytes.byteLength < minimumLength ||
        bytes.byteLength > maximumLength ||
        bytes.toString("base64url") !== value
      ) {
        context.addIssue({ code: "custom", message: "Invalid binary length or encoding." });
      }
    });
}

function envelopeSchema(maximumCiphertextBytes: number) {
  return z.strictObject({
    envelopeVersion: z.literal(1),
    algorithm: z.literal("AES-256-GCM"),
    nonce: encodedBytes(12, 12),
    tagBits: z.literal(128),
    ciphertext: encodedBytes(16, maximumCiphertextBytes),
  });
}

export const workspaceIdSchema = z.string().regex(UUID_V4_PATTERN);
export const customTaskCategoryIdSchema = workspaceIdSchema.refine(
  (id) => !builtInTaskCategoryById(id),
);
export const optionalProjectIdSchema = workspaceIdSchema.nullable();

const newProjectSchema = z.strictObject({
  id: workspaceIdSchema,
  envelope: envelopeSchema(WORKSPACE_CIPHERTEXT_LIMITS.project),
});
const newEnvBundleSchema = z.strictObject({
  id: workspaceIdSchema,
  projectId: workspaceIdSchema,
  envelope: envelopeSchema(WORKSPACE_CIPHERTEXT_LIMITS.envBundle),
});
const newNoteSchema = z.strictObject({
  id: workspaceIdSchema,
  projectId: optionalProjectIdSchema,
  envelope: envelopeSchema(WORKSPACE_CIPHERTEXT_LIMITS.note),
});
const newTaskSchema = z.strictObject({
  id: workspaceIdSchema,
  projectId: optionalProjectIdSchema,
  categoryId: optionalProjectIdSchema,
  done: z.boolean(),
  sortOrder: z.number().int().min(0).max(WORKSPACE_FIELD_LIMITS.maximumSortOrder),
  envelope: envelopeSchema(WORKSPACE_CIPHERTEXT_LIMITS.task),
});
const newTaskCategorySchema = z.strictObject({
  id: customTaskCategoryIdSchema,
  envelope: envelopeSchema(WORKSPACE_CIPHERTEXT_LIMITS.taskCategory),
});

export const createProjectSchema = z.strictObject({ project: newProjectSchema });
export const replaceProjectSchema = z.strictObject({ project: newProjectSchema.omit({ id: true }) });
export const createEnvBundleSchema = z.strictObject({ bundle: newEnvBundleSchema });
export const replaceEnvBundleSchema = z.strictObject({ bundle: newEnvBundleSchema.omit({ id: true }) });
export const createNoteSchema = z.strictObject({ note: newNoteSchema });
export const replaceNoteSchema = z.strictObject({ note: newNoteSchema.omit({ id: true }) });
export const createTaskSchema = z.strictObject({ task: newTaskSchema });
export const replaceTaskSchema = z.strictObject({ task: newTaskSchema.omit({ id: true }) });
export const createTaskCategorySchema = z.strictObject({ category: newTaskCategorySchema });
export const replaceTaskCategorySchema = z.strictObject({
  category: newTaskCategorySchema.omit({ id: true }),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type ReplaceProjectInput = z.infer<typeof replaceProjectSchema>;
export type CreateEnvBundleInput = z.infer<typeof createEnvBundleSchema>;
export type ReplaceEnvBundleInput = z.infer<typeof replaceEnvBundleSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type ReplaceNoteInput = z.infer<typeof replaceNoteSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type ReplaceTaskInput = z.infer<typeof replaceTaskSchema>;
export type CreateTaskCategoryInput = z.infer<typeof createTaskCategorySchema>;
export type ReplaceTaskCategoryInput = z.infer<typeof replaceTaskCategorySchema>;
