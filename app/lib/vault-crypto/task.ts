import "client-only";

import type { Task } from "../vault-data.types";
import {
  TASK_ENTITY_TYPE,
  WORKSPACE_FIELD_LIMITS,
  WORKSPACE_PAYLOAD_VERSION,
  WORKSPACE_PLAINTEXT_LIMITS,
  type NewTaskCiphertext,
  type TaskCiphertext,
  type TaskInput,
} from "../workspace.types";
import { clearBytes } from "./bytes";
import { VaultCryptoValidationError } from "./errors";
import {
  assertCanonicalDate,
  assertExactKeys,
  assertWorkspaceId,
  assertWorkspaceText,
  decryptWorkspaceRecord,
  encryptWorkspaceRecord,
  serializeWorkspacePayload,
} from "./workspace-record";

interface TaskPayloadV1 {
  payloadVersion: 1;
  title: string;
  description: string | null;
  dueDate: string | null;
  done: boolean;
  sortOrder: number;
}

function validateTaskInput(value: unknown): TaskInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new VaultCryptoValidationError("Task is invalid.");
  }
  const record = value as Record<string, unknown>;
  if (record.projectId !== null) assertWorkspaceId(record.projectId, "Project ID");
  if (record.categoryId !== null) assertWorkspaceId(record.categoryId, "Category ID");
  assertWorkspaceText(record.title, "Task title", WORKSPACE_FIELD_LIMITS.titleCodePoints, false);
  if (record.description !== null) {
    assertWorkspaceText(
      record.description,
      "Task description",
      WORKSPACE_FIELD_LIMITS.descriptionCodePoints,
      true,
    );
  }
  if (record.dueDate !== null) assertCanonicalDate(record.dueDate);
  if (typeof record.done !== "boolean") {
    throw new VaultCryptoValidationError("Task completion is invalid.");
  }
  if (
    typeof record.sortOrder !== "number" ||
    !Number.isSafeInteger(record.sortOrder) ||
    record.sortOrder < 0 ||
    record.sortOrder > WORKSPACE_FIELD_LIMITS.maximumSortOrder
  ) {
    throw new VaultCryptoValidationError("Task sort order is invalid.");
  }
  return {
    projectId: record.projectId,
    categoryId: record.categoryId,
    title: record.title,
    description: record.description,
    dueDate: record.dueDate,
    done: record.done,
    sortOrder: record.sortOrder,
  };
}

function parseTaskPayload(value: unknown, metadata: TaskCiphertext): TaskPayloadV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new VaultCryptoValidationError("Decrypted task is invalid.");
  }
  const record = value as Record<string, unknown>;
  assertExactKeys(
    record,
    ["payloadVersion", "title", "description", "dueDate", "done", "sortOrder"],
    "Decrypted task is invalid.",
  );
  if (record.payloadVersion !== WORKSPACE_PAYLOAD_VERSION) {
    throw new VaultCryptoValidationError("Decrypted task is invalid.");
  }
  const validated = validateTaskInput({
    projectId: metadata.projectId,
    categoryId: metadata.categoryId,
    title: record.title,
    description: record.description,
    dueDate: record.dueDate,
    done: record.done,
    sortOrder: record.sortOrder,
  });
  if (validated.done !== metadata.done || validated.sortOrder !== metadata.sortOrder) {
    throw new VaultCryptoValidationError("Task metadata authentication failed.");
  }
  return {
    payloadVersion: WORKSPACE_PAYLOAD_VERSION,
    title: validated.title,
    description: validated.description,
    dueDate: validated.dueDate,
    done: validated.done,
    sortOrder: validated.sortOrder,
  };
}

export function prepareTaskInput(input: TaskInput): TaskInput {
  return validateTaskInput({
    projectId: input.projectId,
    categoryId: input.categoryId,
    title: input.title.trim(),
    description: input.description && input.description.length > 0 ? input.description : null,
    dueDate: input.dueDate && input.dueDate.length > 0 ? input.dueDate : null,
    done: input.done,
    sortOrder: input.sortOrder,
  });
}

export async function encryptTask(
  ownerId: string,
  dek: CryptoKey,
  input: TaskInput,
  existingId?: string,
): Promise<NewTaskCiphertext> {
  const validated = prepareTaskInput(input);
  const payload: TaskPayloadV1 = {
    payloadVersion: 1,
    title: validated.title,
    description: validated.description,
    dueDate: validated.dueDate,
    done: validated.done,
    sortOrder: validated.sortOrder,
  };
  const plaintext = serializeWorkspacePayload(payload, WORKSPACE_PLAINTEXT_LIMITS.task, "Task");
  try {
    return {
      ...(await encryptWorkspaceRecord(
        ownerId,
        dek,
        TASK_ENTITY_TYPE,
        [validated.projectId, validated.categoryId].filter((id): id is string => id !== null),
        plaintext,
        existingId,
      )),
      projectId: validated.projectId,
      categoryId: validated.categoryId,
      done: validated.done,
      sortOrder: validated.sortOrder,
    };
  } finally {
    clearBytes(plaintext);
  }
}

export async function decryptTask(
  ownerId: string,
  dek: CryptoKey,
  item: TaskCiphertext,
): Promise<Task> {
  const serialized = await decryptWorkspaceRecord(
    ownerId,
    dek,
    item.id,
    TASK_ENTITY_TYPE,
    [item.projectId, item.categoryId].filter((id): id is string => id !== null),
    item.envelope,
    WORKSPACE_PLAINTEXT_LIMITS.task,
    "task",
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    throw new VaultCryptoValidationError("Decrypted task is invalid.");
  }
  const payload = parseTaskPayload(parsed, item);
  if (JSON.stringify(payload) !== serialized) {
    throw new VaultCryptoValidationError("Decrypted task is invalid.");
  }
  return {
    id: item.id,
    ...(item.projectId ? { projectId: item.projectId } : {}),
    ...(item.categoryId ? { categoryId: item.categoryId } : {}),
    title: payload.title,
    description: payload.description ?? undefined,
    dueDate: payload.dueDate ?? undefined,
    done: payload.done,
    sortOrder: payload.sortOrder,
    updatedAt: item.updatedAt,
  };
}
