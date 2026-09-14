import "server-only";

import { z } from "zod";
import {
  VAULT_BACKUP_FORMAT,
  VAULT_BACKUP_FORMAT_VERSION,
  VAULT_BACKUP_MANIFEST_VERSION,
} from "../vault-backup.types";
import { findVaultBackupRelationshipIssues } from "../vault-backup-validation";
import { createVaultItemSchema } from "../vault-items/validation";
import { vaultEncryptionProfileSchema } from "../vault-profile/validation";
import {
  createEnvBundleSchema,
  createNoteSchema,
  createProjectSchema,
  createTaskCategorySchema,
  createTaskSchema,
} from "../workspace/validation";

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;

function encodedBytes(minimumLength: number, maximumLength: number) {
  return z.string().max(Math.ceil(maximumLength * 4 / 3)).superRefine((value, context) => {
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

const timestampSchema = z.string().refine((value) =>
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value
);

function storedRecord<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.extend({ createdAt: timestampSchema, updatedAt: timestampSchema });
}

const vaultItemSchema = storedRecord(createVaultItemSchema.shape.item);
const projectSchema = storedRecord(createProjectSchema.shape.project);
const envBundleSchema = storedRecord(createEnvBundleSchema.shape.bundle);
const noteSchema = storedRecord(createNoteSchema.shape.note);
const taskCategorySchema = storedRecord(createTaskCategorySchema.shape.category);
const taskSchema = storedRecord(createTaskSchema.shape.task);

export const vaultCiphertextRecordsSchema = z.strictObject({
  vaultItems: z.array(vaultItemSchema),
  projects: z.array(projectSchema),
  envBundles: z.array(envBundleSchema),
  notes: z.array(noteSchema),
  taskCategories: z.array(taskCategorySchema),
  tasks: z.array(taskSchema),
});

export const vaultBackupSnapshotSchema = z.strictObject({
  profile: vaultEncryptionProfileSchema,
  records: vaultCiphertextRecordsSchema,
});

const manifestSchema = z.strictObject({
  manifestVersion: z.literal(VAULT_BACKUP_MANIFEST_VERSION),
  algorithm: z.literal("AES-256-GCM"),
  nonce: encodedBytes(12, 12),
  tagBits: z.literal(128),
  ciphertext: encodedBytes(16, 1_024),
});

export const encryptedVaultBackupSchema = vaultBackupSnapshotSchema.extend({
  format: z.literal(VAULT_BACKUP_FORMAT),
  formatVersion: z.literal(VAULT_BACKUP_FORMAT_VERSION),
  exportedAt: timestampSchema,
  manifest: manifestSchema,
}).superRefine((backup, context) => {
  const collections = [
    ["vaultItems", backup.records.vaultItems],
    ["projects", backup.records.projects],
    ["envBundles", backup.records.envBundles],
    ["notes", backup.records.notes],
    ["taskCategories", backup.records.taskCategories],
    ["tasks", backup.records.tasks],
  ] as const;
  for (const [name, records] of collections) {
    records.forEach((record, index) => {
      if (Date.parse(record.updatedAt) < Date.parse(record.createdAt)) {
        context.addIssue({
          code: "custom",
          path: ["records", name, index, "updatedAt"],
          message: "Timestamp order is invalid.",
        });
      }
    });
  }
  for (const issue of findVaultBackupRelationshipIssues(backup.records)) {
    context.addIssue({ code: "custom", path: ["records", ...issue.path.split(".")], message: issue.message });
  }
});

export const restoreVaultBackupSchema = z.strictObject({
  backup: encryptedVaultBackupSchema,
  expectedProfile: vaultEncryptionProfileSchema.pick({
    profileId: true,
    profileRevision: true,
  }).nullable(),
});

export type RestoreVaultBackupInput = z.infer<typeof restoreVaultBackupSchema>;
