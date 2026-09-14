import { builtInTaskCategoryById } from "./task-categories";
import type { VaultCiphertextRecords } from "./vault-backup.types";

export interface VaultBackupRelationshipIssue {
  path: string;
  message: string;
}

function duplicateIds(records: readonly { id: string }[]): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const record of records) {
    if (seen.has(record.id)) duplicates.add(record.id);
    seen.add(record.id);
  }
  return duplicates;
}

// Relationships are authenticated inside record AAD, but validating the whole
// set before restore prevents a well-formed backup from creating orphans.
export function findVaultBackupRelationshipIssues(
  records: VaultCiphertextRecords,
): VaultBackupRelationshipIssue[] {
  const issues: VaultBackupRelationshipIssue[] = [];
  const collections = [
    ["vaultItems", records.vaultItems],
    ["projects", records.projects],
    ["envBundles", records.envBundles],
    ["notes", records.notes],
    ["taskCategories", records.taskCategories],
    ["tasks", records.tasks],
  ] as const;

  for (const [name, collection] of collections) {
    if (duplicateIds(collection).size > 0) {
      issues.push({ path: name, message: "Duplicate record IDs are not allowed." });
    }
  }

  const projectIds = new Set(records.projects.map((project) => project.id));
  const customCategoryIds = new Set(records.taskCategories.map((category) => category.id));

  records.vaultItems.forEach((item, index) => {
    if (item.projectId && !projectIds.has(item.projectId)) {
      issues.push({ path: `vaultItems.${index}.projectId`, message: "Project is missing." });
    }
  });
  records.envBundles.forEach((bundle, index) => {
    if (!projectIds.has(bundle.projectId)) {
      issues.push({ path: `envBundles.${index}.projectId`, message: "Project is missing." });
    }
  });
  records.notes.forEach((note, index) => {
    if (note.projectId && !projectIds.has(note.projectId)) {
      issues.push({ path: `notes.${index}.projectId`, message: "Project is missing." });
    }
  });
  records.tasks.forEach((task, index) => {
    if (task.projectId && !projectIds.has(task.projectId)) {
      issues.push({ path: `tasks.${index}.projectId`, message: "Project is missing." });
    }
    if (
      task.categoryId &&
      !builtInTaskCategoryById(task.categoryId) &&
      !customCategoryIds.has(task.categoryId)
    ) {
      issues.push({ path: `tasks.${index}.categoryId`, message: "Task category is missing." });
    }
  });

  return issues;
}

export function vaultBackupRecordCounts(records: VaultCiphertextRecords) {
  return {
    vaultItems: records.vaultItems.length,
    projects: records.projects.length,
    envBundles: records.envBundles.length,
    notes: records.notes.length,
    taskCategories: records.taskCategories.length,
    tasks: records.tasks.length,
  };
}
