import "client-only";

import type { Note } from "../vault-data.types";
import {
  NOTE_ENTITY_TYPE,
  WORKSPACE_FIELD_LIMITS,
  WORKSPACE_PAYLOAD_VERSION,
  WORKSPACE_PLAINTEXT_LIMITS,
  type NewNoteCiphertext,
  type NoteCiphertext,
  type NoteInput,
} from "../workspace.types";
import { clearBytes } from "./bytes";
import { VaultCryptoValidationError } from "./errors";
import {
  assertCanonicalTags,
  assertExactKeys,
  assertWorkspaceId,
  assertWorkspaceText,
  decryptWorkspaceRecord,
  encryptWorkspaceRecord,
  serializeWorkspacePayload,
} from "./workspace-record";

interface NotePayloadV1 {
  payloadVersion: 1;
  title: string;
  body: string;
  tags: string[];
}

function validateNoteInput(value: unknown): NoteInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new VaultCryptoValidationError("Note is invalid.");
  }
  const record = value as Record<string, unknown>;
  if (record.projectId !== null) assertWorkspaceId(record.projectId, "Project ID");
  assertWorkspaceText(record.title, "Note title", WORKSPACE_FIELD_LIMITS.titleCodePoints, false);
  assertWorkspaceText(record.body, "Note body", WORKSPACE_FIELD_LIMITS.noteBodyCodePoints, true);
  return {
    projectId: record.projectId,
    title: record.title,
    body: record.body,
    tags: assertCanonicalTags(
      record.tags,
      WORKSPACE_FIELD_LIMITS.tagCount,
      WORKSPACE_FIELD_LIMITS.tagCodePoints,
    ),
  };
}

function parseNotePayload(value: unknown, projectId: string | null): NotePayloadV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new VaultCryptoValidationError("Decrypted note is invalid.");
  }
  const record = value as Record<string, unknown>;
  assertExactKeys(record, ["payloadVersion", "title", "body", "tags"], "Decrypted note is invalid.");
  if (record.payloadVersion !== WORKSPACE_PAYLOAD_VERSION) {
    throw new VaultCryptoValidationError("Decrypted note is invalid.");
  }
  const validated = validateNoteInput({
    projectId,
    title: record.title,
    body: record.body,
    tags: record.tags,
  });
  return {
    payloadVersion: WORKSPACE_PAYLOAD_VERSION,
    title: validated.title,
    body: validated.body,
    tags: validated.tags,
  };
}

export function prepareNoteInput(input: {
  projectId: string | null;
  title: string;
  body: string;
  tags: string | string[];
}): NoteInput {
  const tags = typeof input.tags === "string"
    ? input.tags.split(",").map((tag) => tag.trim()).filter((tag, index, all) => tag.length > 0 && all.indexOf(tag) === index)
    : input.tags;
  return validateNoteInput({
    projectId: input.projectId,
    title: input.title.trim(),
    body: input.body,
    tags,
  });
}

export async function encryptNote(
  ownerId: string,
  dek: CryptoKey,
  input: NoteInput,
  existingId?: string,
): Promise<NewNoteCiphertext> {
  const validated = prepareNoteInput(input);
  const payload: NotePayloadV1 = {
    payloadVersion: 1,
    title: validated.title,
    body: validated.body,
    tags: validated.tags,
  };
  const plaintext = serializeWorkspacePayload(payload, WORKSPACE_PLAINTEXT_LIMITS.note, "Note");
  const relationships = validated.projectId ? [validated.projectId] : [];
  try {
    return {
      ...(await encryptWorkspaceRecord(
        ownerId,
        dek,
        NOTE_ENTITY_TYPE,
        relationships,
        plaintext,
        existingId,
      )),
      projectId: validated.projectId,
    };
  } finally {
    clearBytes(plaintext);
  }
}

export async function decryptNote(
  ownerId: string,
  dek: CryptoKey,
  item: NoteCiphertext,
): Promise<Note> {
  const serialized = await decryptWorkspaceRecord(
    ownerId,
    dek,
    item.id,
    NOTE_ENTITY_TYPE,
    item.projectId ? [item.projectId] : [],
    item.envelope,
    WORKSPACE_PLAINTEXT_LIMITS.note,
    "note",
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    throw new VaultCryptoValidationError("Decrypted note is invalid.");
  }
  const payload = parseNotePayload(parsed, item.projectId);
  if (JSON.stringify(payload) !== serialized) {
    throw new VaultCryptoValidationError("Decrypted note is invalid.");
  }
  return {
    id: item.id,
    projectId: item.projectId ?? undefined,
    title: payload.title,
    body: payload.body,
    tags: payload.tags,
    updatedAt: item.updatedAt,
  };
}
