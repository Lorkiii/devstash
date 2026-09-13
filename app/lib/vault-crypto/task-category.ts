import "client-only";

import type { TaskCategory } from "../vault-data.types";
import {
  TASK_CATEGORY_ENTITY_TYPE,
  WORKSPACE_FIELD_LIMITS,
  WORKSPACE_PAYLOAD_VERSION,
  WORKSPACE_PLAINTEXT_LIMITS,
  type NewTaskCategoryCiphertext,
  type TaskCategoryCiphertext,
  type TaskCategoryInput,
} from "../workspace.types";
import { isTaskCategoryColorToken } from "../task-categories";
import { clearBytes } from "./bytes";
import { VaultCryptoValidationError } from "./errors";
import {
  assertExactKeys,
  assertWorkspaceText,
  decryptWorkspaceRecord,
  encryptWorkspaceRecord,
  serializeWorkspacePayload,
} from "./workspace-record";

interface TaskCategoryPayloadV1 {
  payloadVersion: 1;
  name: string;
  colorToken: TaskCategoryInput["colorToken"];
}

function validateTaskCategoryInput(value: unknown): TaskCategoryInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new VaultCryptoValidationError("Task category is invalid.");
  }
  const record = value as Record<string, unknown>;
  assertWorkspaceText(
    record.name,
    "Category name",
    WORKSPACE_FIELD_LIMITS.categoryNameCodePoints,
    false,
  );
  if (!isTaskCategoryColorToken(record.colorToken)) {
    throw new VaultCryptoValidationError("Category color is invalid.");
  }
  return { name: record.name, colorToken: record.colorToken };
}

function parseTaskCategoryPayload(value: unknown): TaskCategoryPayloadV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new VaultCryptoValidationError("Decrypted task category is invalid.");
  }
  const record = value as Record<string, unknown>;
  assertExactKeys(
    record,
    ["payloadVersion", "name", "colorToken"],
    "Decrypted task category is invalid.",
  );
  if (record.payloadVersion !== WORKSPACE_PAYLOAD_VERSION) {
    throw new VaultCryptoValidationError("Decrypted task category is invalid.");
  }
  return { payloadVersion: WORKSPACE_PAYLOAD_VERSION, ...validateTaskCategoryInput(record) };
}

export function prepareTaskCategoryInput(input: TaskCategoryInput): TaskCategoryInput {
  return validateTaskCategoryInput({ name: input.name.trim(), colorToken: input.colorToken });
}

export async function encryptTaskCategory(
  ownerId: string,
  dek: CryptoKey,
  input: TaskCategoryInput,
  existingId?: string,
): Promise<NewTaskCategoryCiphertext> {
  const validated = prepareTaskCategoryInput(input);
  const plaintext = serializeWorkspacePayload(
    { payloadVersion: WORKSPACE_PAYLOAD_VERSION, ...validated },
    WORKSPACE_PLAINTEXT_LIMITS.taskCategory,
    "Task category",
  );
  try {
    return await encryptWorkspaceRecord(
      ownerId,
      dek,
      TASK_CATEGORY_ENTITY_TYPE,
      [],
      plaintext,
      existingId,
    );
  } finally {
    clearBytes(plaintext);
  }
}

export async function decryptTaskCategory(
  ownerId: string,
  dek: CryptoKey,
  item: TaskCategoryCiphertext,
): Promise<TaskCategory> {
  const serialized = await decryptWorkspaceRecord(
    ownerId,
    dek,
    item.id,
    TASK_CATEGORY_ENTITY_TYPE,
    [],
    item.envelope,
    WORKSPACE_PLAINTEXT_LIMITS.taskCategory,
    "task category",
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    throw new VaultCryptoValidationError("Decrypted task category is invalid.");
  }
  const payload = parseTaskCategoryPayload(parsed);
  if (JSON.stringify(payload) !== serialized) {
    throw new VaultCryptoValidationError("Decrypted task category is invalid.");
  }
  return {
    id: item.id,
    name: payload.name,
    colorToken: payload.colorToken,
    builtIn: false,
    updatedAt: item.updatedAt,
  };
}
