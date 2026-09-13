import "client-only";

import type { Project } from "../vault-data.types";
import {
  PROJECT_ENTITY_TYPE,
  WORKSPACE_FIELD_LIMITS,
  WORKSPACE_PAYLOAD_VERSION,
  WORKSPACE_PLAINTEXT_LIMITS,
  type NewProjectCiphertext,
  type ProjectCiphertext,
  type ProjectInput,
} from "../workspace.types";
import { clearBytes } from "./bytes";
import { VaultCryptoValidationError } from "./errors";
import {
  assertExactKeys,
  assertWorkspaceText,
  decryptWorkspaceRecord,
  encryptWorkspaceRecord,
  serializeWorkspacePayload,
} from "./workspace-record";

interface ProjectPayloadV1 {
  payloadVersion: 1;
  name: string;
  description: string;
}

function validateProjectInput(value: unknown): ProjectInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new VaultCryptoValidationError("Project is invalid.");
  }
  const record = value as Record<string, unknown>;
  assertWorkspaceText(record.name, "Project name", WORKSPACE_FIELD_LIMITS.titleCodePoints, false);
  assertWorkspaceText(
    record.description,
    "Project description",
    WORKSPACE_FIELD_LIMITS.descriptionCodePoints,
    true,
  );
  return { name: record.name, description: record.description };
}

function parseProjectPayload(value: unknown): ProjectPayloadV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new VaultCryptoValidationError("Decrypted project is invalid.");
  }
  const record = value as Record<string, unknown>;
  assertExactKeys(record, ["payloadVersion", "name", "description"], "Decrypted project is invalid.");
  if (record.payloadVersion !== WORKSPACE_PAYLOAD_VERSION) {
    throw new VaultCryptoValidationError("Decrypted project is invalid.");
  }
  return { payloadVersion: WORKSPACE_PAYLOAD_VERSION, ...validateProjectInput(record) };
}

export function prepareProjectInput(input: ProjectInput): ProjectInput {
  return validateProjectInput({ name: input.name.trim(), description: input.description });
}

export async function encryptProject(
  ownerId: string,
  dek: CryptoKey,
  input: ProjectInput,
  existingId?: string,
): Promise<NewProjectCiphertext> {
  const validated = prepareProjectInput(input);
  const payload: ProjectPayloadV1 = { payloadVersion: 1, ...validated };
  const plaintext = serializeWorkspacePayload(payload, WORKSPACE_PLAINTEXT_LIMITS.project, "Project");
  try {
    return await encryptWorkspaceRecord(ownerId, dek, PROJECT_ENTITY_TYPE, [], plaintext, existingId);
  } finally {
    clearBytes(plaintext);
  }
}

export async function decryptProject(
  ownerId: string,
  dek: CryptoKey,
  item: ProjectCiphertext,
): Promise<Project> {
  const serialized = await decryptWorkspaceRecord(
    ownerId,
    dek,
    item.id,
    PROJECT_ENTITY_TYPE,
    [],
    item.envelope,
    WORKSPACE_PLAINTEXT_LIMITS.project,
    "project",
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    throw new VaultCryptoValidationError("Decrypted project is invalid.");
  }
  const payload = parseProjectPayload(parsed);
  if (JSON.stringify(payload) !== serialized) {
    throw new VaultCryptoValidationError("Decrypted project is invalid.");
  }
  return { id: item.id, name: payload.name, description: payload.description, updatedAt: item.updatedAt };
}
