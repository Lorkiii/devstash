import "server-only";

import { z } from "zod";
import {
  GENERIC_SECRET_ITEM_TYPE,
  MAXIMUM_VAULT_ITEM_CIPHERTEXT_BYTES,
} from "../vault-item.types";

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

export const vaultItemIdSchema = z.string().regex(UUID_V4_PATTERN);

export const vaultItemEnvelopeSchema = z.strictObject({
  envelopeVersion: z.literal(1),
  algorithm: z.literal("AES-256-GCM"),
  nonce: encodedBytes(12, 12),
  tagBits: z.literal(128),
  ciphertext: encodedBytes(16, MAXIMUM_VAULT_ITEM_CIPHERTEXT_BYTES),
});

const newVaultItemSchema = z.strictObject({
  id: vaultItemIdSchema,
  projectId: vaultItemIdSchema.nullable(),
  itemType: z.literal(GENERIC_SECRET_ITEM_TYPE),
  envelope: vaultItemEnvelopeSchema,
});

export const createVaultItemSchema = z.strictObject({ item: newVaultItemSchema });

export const replaceVaultItemSchema = z.strictObject({
  item: newVaultItemSchema.omit({ id: true }),
});

export type CreateVaultItemInput = z.infer<typeof createVaultItemSchema>;
export type ReplaceVaultItemInput = z.infer<typeof replaceVaultItemSchema>;
