import "client-only";

import type { EnvBundle } from "../vault-data.types";
import {
  ENV_BUNDLE_ENTITY_TYPE,
  WORKSPACE_FIELD_LIMITS,
  WORKSPACE_PAYLOAD_VERSION,
  WORKSPACE_PLAINTEXT_LIMITS,
  type EnvBundleCiphertext,
  type EnvBundleInput,
  type NewEnvBundleCiphertext,
} from "../workspace.types";
import { clearBytes } from "./bytes";
import { VaultCryptoValidationError } from "./errors";
import {
  assertExactKeys,
  assertWorkspaceId,
  assertWorkspaceText,
  decryptWorkspaceRecord,
  encryptWorkspaceRecord,
  serializeWorkspacePayload,
} from "./workspace-record";

interface EnvBundlePayloadV1 {
  payloadVersion: 1;
  environment: string;
  content: string;
}

function validateEnvBundleInput(value: unknown): EnvBundleInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new VaultCryptoValidationError("Environment bundle is invalid.");
  }
  const record = value as Record<string, unknown>;
  assertWorkspaceId(record.projectId, "Project ID");
  assertWorkspaceText(
    record.environment,
    "Environment name",
    WORKSPACE_FIELD_LIMITS.environmentCodePoints,
    false,
  );
  assertWorkspaceText(
    record.content,
    "Environment content",
    WORKSPACE_FIELD_LIMITS.envContentCodePoints,
    true,
  );
  return { projectId: record.projectId, environment: record.environment, content: record.content };
}

function parseEnvBundlePayload(value: unknown, projectId: string): EnvBundlePayloadV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new VaultCryptoValidationError("Decrypted environment bundle is invalid.");
  }
  const record = value as Record<string, unknown>;
  assertExactKeys(
    record,
    ["payloadVersion", "environment", "content"],
    "Decrypted environment bundle is invalid.",
  );
  if (record.payloadVersion !== WORKSPACE_PAYLOAD_VERSION) {
    throw new VaultCryptoValidationError("Decrypted environment bundle is invalid.");
  }
  const validated = validateEnvBundleInput({ projectId, environment: record.environment, content: record.content });
  return { payloadVersion: WORKSPACE_PAYLOAD_VERSION, environment: validated.environment, content: validated.content };
}

export function prepareEnvBundleInput(input: EnvBundleInput): EnvBundleInput {
  return validateEnvBundleInput({
    projectId: input.projectId,
    environment: input.environment.trim(),
    content: input.content,
  });
}

export async function encryptEnvBundle(
  ownerId: string,
  dek: CryptoKey,
  input: EnvBundleInput,
  existingId?: string,
): Promise<NewEnvBundleCiphertext> {
  const validated = prepareEnvBundleInput(input);
  const payload: EnvBundlePayloadV1 = {
    payloadVersion: 1,
    environment: validated.environment,
    content: validated.content,
  };
  const plaintext = serializeWorkspacePayload(payload, WORKSPACE_PLAINTEXT_LIMITS.envBundle, "Environment bundle");
  try {
    return {
      ...(await encryptWorkspaceRecord(
        ownerId,
        dek,
        ENV_BUNDLE_ENTITY_TYPE,
        [validated.projectId],
        plaintext,
        existingId,
      )),
      projectId: validated.projectId,
    };
  } finally {
    clearBytes(plaintext);
  }
}

export async function decryptEnvBundle(
  ownerId: string,
  dek: CryptoKey,
  item: EnvBundleCiphertext,
): Promise<EnvBundle> {
  const serialized = await decryptWorkspaceRecord(
    ownerId,
    dek,
    item.id,
    ENV_BUNDLE_ENTITY_TYPE,
    [item.projectId],
    item.envelope,
    WORKSPACE_PLAINTEXT_LIMITS.envBundle,
    "environment bundle",
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    throw new VaultCryptoValidationError("Decrypted environment bundle is invalid.");
  }
  const payload = parseEnvBundlePayload(parsed, item.projectId);
  if (JSON.stringify(payload) !== serialized) {
    throw new VaultCryptoValidationError("Decrypted environment bundle is invalid.");
  }
  return {
    id: item.id,
    projectId: item.projectId,
    environment: payload.environment,
    content: payload.content,
    updatedAt: item.updatedAt,
  };
}
