import "client-only";

import { BUILT_IN_TASK_CATEGORIES } from "./task-categories";
import type { VaultCiphertextRecords } from "./vault-backup.types";
import type { TaskCategory, VaultData } from "./vault-data.types";
import { decryptEnvBundle } from "./vault-crypto/env-bundle";
import { decryptGenericSecret } from "./vault-crypto/generic-secret";
import { decryptNote } from "./vault-crypto/note";
import { decryptProject } from "./vault-crypto/project";
import { decryptTask } from "./vault-crypto/task";
import { decryptTaskCategory } from "./vault-crypto/task-category";

// A snapshot enters unlocked state only after every ciphertext and relationship
// authenticates. Callers never receive a partially decrypted collection.
export async function decryptVaultSnapshot(
  ownerId: string,
  dek: CryptoKey,
  records: VaultCiphertextRecords,
): Promise<VaultData> {
  const [secrets, projects, envBundles, notes, customTaskCategories, tasks] = await Promise.all([
    Promise.all(records.vaultItems.map((item) => decryptGenericSecret(ownerId, dek, item))),
    Promise.all(records.projects.map((item) => decryptProject(ownerId, dek, item))),
    Promise.all(records.envBundles.map((item) => decryptEnvBundle(ownerId, dek, item))),
    Promise.all(records.notes.map((item) => decryptNote(ownerId, dek, item))),
    Promise.all(records.taskCategories.map((item) => decryptTaskCategory(ownerId, dek, item))),
    Promise.all(records.tasks.map((item) => decryptTask(ownerId, dek, item))),
  ]);
  const projectIds = new Set(projects.map((project) => project.id));
  const taskCategories: TaskCategory[] = [...BUILT_IN_TASK_CATEGORIES, ...customTaskCategories];
  const taskCategoryIds = new Set(taskCategories.map((category) => category.id));
  if (
    secrets.some((item) => item.projectId && !projectIds.has(item.projectId)) ||
    envBundles.some((bundle) => !projectIds.has(bundle.projectId)) ||
    notes.some((note) => note.projectId && !projectIds.has(note.projectId)) ||
    tasks.some((task) => task.projectId && !projectIds.has(task.projectId)) ||
    tasks.some((task) => task.categoryId && !taskCategoryIds.has(task.categoryId))
  ) {
    throw new Error("Encrypted workspace relationships are invalid.");
  }
  return { secrets, projects, envBundles, notes, tasks, taskCategories };
}
