import "server-only";

import type { VaultItemModel } from "@/app/generated/prisma/models/VaultItem";
import { getAuthEnvironment } from "../auth/environment";
import { getPrisma } from "../prisma";
import type { VaultItemCiphertext } from "../vault-item.types";
import type { CreateVaultItemInput, ReplaceVaultItemInput } from "./validation";
import { createVaultItemSchema } from "./validation";

export class VaultItemConflictError extends Error {
  override readonly name = "VaultItemConflictError";
}

export class VaultItemNotFoundError extends Error {
  override readonly name = "VaultItemNotFoundError";
}

function database() {
  const environment = getAuthEnvironment();
  if (!environment) throw new Error("Application configuration is unavailable.");
  return getPrisma(environment.databaseUrl);
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

function toVaultItemDto(item: VaultItemModel): VaultItemCiphertext {
  const parsed = createVaultItemSchema.safeParse({
    item: {
      id: item.id,
      projectId: item.projectId,
      itemType: item.itemType,
      envelope: {
        envelopeVersion: item.envelopeVersion,
        algorithm: item.algorithm,
        nonce: encodeBytes(item.nonce),
        tagBits: item.tagBits,
        ciphertext: encodeBytes(item.ciphertext),
      },
    },
  });
  if (!parsed.success) throw new Error("Stored vault item is invalid.");
  return {
    ...parsed.data.item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function envelopeData(input: CreateVaultItemInput["item"] | ReplaceVaultItemInput["item"]) {
  return {
    projectId: input.projectId,
    itemType: input.itemType,
    envelopeVersion: input.envelope.envelopeVersion,
    algorithm: input.envelope.algorithm,
    nonce: decodeBytes(input.envelope.nonce),
    tagBits: input.envelope.tagBits,
    ciphertext: decodeBytes(input.envelope.ciphertext),
  };
}

async function assertOwnedProject(ownerId: string, projectId: string | null): Promise<void> {
  if (!projectId) return;
  const count = await database().project.count({ where: { id: projectId, ownerId } });
  if (count !== 1) throw new VaultItemNotFoundError();
}

export async function findVaultItems(ownerId: string): Promise<VaultItemCiphertext[]> {
  const items = await database().vaultItem.findMany({
    where: { ownerId },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  });
  return items.map(toVaultItemDto);
}

export async function createVaultItem(
  ownerId: string,
  input: CreateVaultItemInput,
): Promise<VaultItemCiphertext> {
  await assertOwnedProject(ownerId, input.item.projectId);
  try {
    const created = await database().vaultItem.create({
      data: { id: input.item.id, ownerId, ...envelopeData(input.item) },
    });
    return toVaultItemDto(created);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new VaultItemConflictError();
    }
    throw error;
  }
}

export async function replaceVaultItem(
  ownerId: string,
  id: string,
  input: ReplaceVaultItemInput,
): Promise<VaultItemCiphertext> {
  await assertOwnedProject(ownerId, input.item.projectId);
  const updated = await database().vaultItem.updateManyAndReturn({
    where: { id, ownerId },
    data: envelopeData(input.item),
  });
  if (updated.length !== 1) throw new VaultItemNotFoundError();
  return toVaultItemDto(updated[0]);
}

export async function deleteVaultItem(ownerId: string, id: string): Promise<void> {
  const deleted = await database().vaultItem.deleteMany({ where: { id, ownerId } });
  if (deleted.count !== 1) throw new VaultItemNotFoundError();
}
