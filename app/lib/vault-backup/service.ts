import "server-only";

import { builtInTaskCategoryById } from "../task-categories";
import type {
  EncryptedVaultBackup,
  VaultBackupRestoreResult,
  VaultBackupRestoreExpectation,
  VaultBackupSnapshot,
} from "../vault-backup.types";
import { vaultBackupRecordCounts } from "../vault-backup-validation";
import { getAuthEnvironment } from "../auth/environment";
import { getPrisma } from "../prisma";
import { toVaultItemDto } from "../vault-items/service";
import { toVaultProfileDto } from "../vault-profile/service";
import {
  toEnvBundleDto,
  toNoteDto,
  toProjectDto,
  toTaskCategoryDto,
  toTaskDto,
} from "../workspace/service";
import type { WorkspaceEnvelope } from "../workspace.types";

export class VaultBackupNotFoundError extends Error {
  override readonly name = "VaultBackupNotFoundError";
}

export class VaultBackupConflictError extends Error {
  override readonly name = "VaultBackupConflictError";
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

function envelopeData(envelope: WorkspaceEnvelope) {
  return {
    envelopeVersion: envelope.envelopeVersion,
    algorithm: envelope.algorithm,
    nonce: decodeBytes(envelope.nonce),
    tagBits: envelope.tagBits,
    ciphertext: decodeBytes(envelope.ciphertext),
  };
}

function profileData(ownerId: string, profile: EncryptedVaultBackup["profile"]) {
  return {
    id: profile.profileId,
    ownerId,
    profileFormatVersion: profile.profileFormatVersion,
    profileRevision: profile.profileRevision,
    passphraseWrapRevision: profile.passphraseWrapRevision,
    recoveryWrapRevision: profile.recoveryWrapRevision,
    passphraseEncoding: profile.passphraseEncoding,
    kdfAlgorithm: profile.kdf.algorithm,
    kdfAlgorithmVersion: profile.kdf.algorithmVersion,
    kdfSalt: decodeBytes(profile.kdf.salt),
    kdfMemoryKiB: profile.kdf.memoryKiB,
    kdfIterations: profile.kdf.iterations,
    kdfParallelism: profile.kdf.parallelism,
    kdfOutputBytes: profile.kdf.outputBytes,
    passphraseWrapAlgorithm: profile.passphraseKeyWrap.algorithm,
    passphraseWrapNonce: decodeBytes(profile.passphraseKeyWrap.nonce),
    passphraseWrapTagBits: profile.passphraseKeyWrap.tagBits,
    passphraseWrappedDek: decodeBytes(profile.passphraseKeyWrap.wrappedDek),
    recoveryPhraseEncoding: profile.recovery.phraseEncoding,
    recoveryKdfAlgorithm: profile.recovery.kdf.algorithm,
    recoveryKdfSalt: decodeBytes(profile.recovery.kdf.salt),
    recoveryKdfInfo: profile.recovery.kdf.info,
    recoveryKdfOutputBytes: profile.recovery.kdf.outputBytes,
    recoveryWrapAlgorithm: profile.recovery.keyWrap.algorithm,
    recoveryWrapNonce: decodeBytes(profile.recovery.keyWrap.nonce),
    recoveryWrapTagBits: profile.recovery.keyWrap.tagBits,
    recoveryWrappedDek: decodeBytes(profile.recovery.keyWrap.wrappedDek),
  };
}

function isPrismaCode(error: unknown, codes: readonly string[]): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    typeof error.code === "string" && codes.includes(error.code);
}

export async function findVaultBackupSnapshot(ownerId: string): Promise<VaultBackupSnapshot> {
  const client = database();
  const snapshot = await client.$transaction(async (transaction) => {
    const [profile, vaultItems, projects, envBundles, notes, taskCategories, tasks] =
      await Promise.all([
        transaction.vaultEncryptionProfile.findUnique({ where: { ownerId } }),
        transaction.vaultItem.findMany({
          where: { ownerId },
          orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        }),
        transaction.project.findMany({
          where: { ownerId },
          orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        }),
        transaction.envBundle.findMany({
          where: { ownerId },
          orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        }),
        transaction.note.findMany({
          where: { ownerId },
          orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        }),
        transaction.taskCategory.findMany({
          where: { ownerId },
          orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        }),
        transaction.task.findMany({
          where: { ownerId },
          orderBy: [{ done: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
        }),
      ]);
    if (!profile) throw new VaultBackupNotFoundError();
    return {
      profile: toVaultProfileDto(profile),
      records: {
        vaultItems: vaultItems.map(toVaultItemDto),
        projects: projects.map(toProjectDto),
        envBundles: envBundles.map(toEnvBundleDto),
        notes: notes.map(toNoteDto),
        taskCategories: taskCategories.map(toTaskCategoryDto),
        tasks: tasks.map(toTaskDto),
      },
    };
  }, { isolationLevel: "RepeatableRead" });
  return snapshot;
}

export async function restoreVaultBackup(
  ownerId: string,
  backup: EncryptedVaultBackup,
  expectedProfile: VaultBackupRestoreExpectation | null,
): Promise<VaultBackupRestoreResult> {
  const client = database();
  try {
    await client.$transaction(async (transaction) => {
      const currentProfile = await transaction.vaultEncryptionProfile.findUnique({
        where: { ownerId },
        select: { id: true, profileRevision: true },
      });
      if (
        expectedProfile === null
          ? currentProfile !== null
          : currentProfile?.id !== expectedProfile.profileId ||
            currentProfile.profileRevision !== expectedProfile.profileRevision
      ) {
        throw new VaultBackupConflictError();
      }
      await transaction.task.deleteMany({ where: { ownerId } });
      await transaction.envBundle.deleteMany({ where: { ownerId } });
      await transaction.vaultItem.deleteMany({ where: { ownerId } });
      await transaction.note.deleteMany({ where: { ownerId } });
      await transaction.taskCategory.deleteMany({ where: { ownerId } });
      await transaction.project.deleteMany({ where: { ownerId } });
      await transaction.vaultEncryptionProfile.deleteMany({ where: { ownerId } });

      await transaction.vaultEncryptionProfile.create({ data: profileData(ownerId, backup.profile) });

      if (backup.records.projects.length > 0) {
        await transaction.project.createMany({
          data: backup.records.projects.map((project) => ({
            id: project.id,
            ownerId,
            ...envelopeData(project.envelope),
            createdAt: new Date(project.createdAt),
            updatedAt: new Date(project.updatedAt),
          })),
        });
      }
      if (backup.records.taskCategories.length > 0) {
        await transaction.taskCategory.createMany({
          data: backup.records.taskCategories.map((category) => ({
            id: category.id,
            ownerId,
            ...envelopeData(category.envelope),
            createdAt: new Date(category.createdAt),
            updatedAt: new Date(category.updatedAt),
          })),
        });
      }
      if (backup.records.vaultItems.length > 0) {
        await transaction.vaultItem.createMany({
          data: backup.records.vaultItems.map((item) => ({
            id: item.id,
            ownerId,
            projectId: item.projectId,
            itemType: item.itemType,
            ...envelopeData(item.envelope),
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt),
          })),
        });
      }
      if (backup.records.envBundles.length > 0) {
        await transaction.envBundle.createMany({
          data: backup.records.envBundles.map((bundle) => ({
            id: bundle.id,
            ownerId,
            projectId: bundle.projectId,
            ...envelopeData(bundle.envelope),
            createdAt: new Date(bundle.createdAt),
            updatedAt: new Date(bundle.updatedAt),
          })),
        });
      }
      if (backup.records.notes.length > 0) {
        await transaction.note.createMany({
          data: backup.records.notes.map((note) => ({
            id: note.id,
            ownerId,
            projectId: note.projectId,
            ...envelopeData(note.envelope),
            createdAt: new Date(note.createdAt),
            updatedAt: new Date(note.updatedAt),
          })),
        });
      }
      if (backup.records.tasks.length > 0) {
        await transaction.task.createMany({
          data: backup.records.tasks.map((task) => {
            const builtIn = task.categoryId ? builtInTaskCategoryById(task.categoryId) : undefined;
            return {
              id: task.id,
              ownerId,
              projectId: task.projectId,
              builtInCategory: builtIn?.key ?? null,
              customCategoryId: builtIn ? null : task.categoryId,
              done: task.done,
              sortOrder: task.sortOrder,
              ...envelopeData(task.envelope),
              createdAt: new Date(task.createdAt),
              updatedAt: new Date(task.updatedAt),
            };
          }),
        });
      }
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (isPrismaCode(error, ["P2002", "P2003", "P2034"])) {
      throw new VaultBackupConflictError();
    }
    throw error;
  }

  return { profile: backup.profile, counts: vaultBackupRecordCounts(backup.records) };
}
