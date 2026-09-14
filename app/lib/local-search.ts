import { VAULT_TYPE_META } from "./vault-types";
import type { VaultData } from "./vault-data.types";

export type LocalSearchKind = "secret" | "project" | "environment" | "note" | "task";

export interface LocalSearchResult {
  id: string;
  kind: LocalSearchKind;
  label: string;
  context?: string;
  href: string;
}

export interface LocalSearchIndexEntry extends LocalSearchResult {
  normalizedLabel: string;
  normalizedSearchText: string;
}

function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}

function searchableEntry(result: LocalSearchResult, privateFields: readonly string[]) {
  return {
    ...result,
    normalizedLabel: normalizeSearchText(result.label),
    normalizedSearchText: normalizeSearchText(privateFields.join("\n")),
  };
}

// The index exists only while the unlocked command palette is mounted. It may
// contain decrypted values for matching, but results expose only a safe label,
// context, and route already visible in the unlocked UI.
export function buildLocalSearchIndex(data: VaultData): LocalSearchIndexEntry[] {
  const projectName = (projectId?: string) =>
    data.projects.find((project) => project.id === projectId)?.name;
  const categoryName = (categoryId?: string) =>
    data.taskCategories.find((category) => category.id === categoryId)?.name;

  return [
    ...data.secrets.map((item) => searchableEntry({
      id: item.id,
      kind: "secret",
      label: item.title,
      context: [VAULT_TYPE_META[item.type].short, projectName(item.projectId)]
        .filter(Boolean)
        .join(" · "),
      href: `/vault?item=${encodeURIComponent(item.id)}`,
    }, [
      item.title,
      ...item.fields.flatMap((field) => [field.label, field.value]),
      item.notes ?? "",
      ...item.tags,
      projectName(item.projectId) ?? "",
    ])),
    ...data.projects.map((project) => searchableEntry({
      id: project.id,
      kind: "project",
      label: project.name,
      context: "Project",
      href: `/projects/${encodeURIComponent(project.id)}`,
    }, [project.name, project.description])),
    ...data.envBundles.map((bundle) => searchableEntry({
      id: bundle.id,
      kind: "environment",
      label: `.env · ${bundle.environment}`,
      context: projectName(bundle.projectId),
      href: `/projects/${encodeURIComponent(bundle.projectId)}`,
    }, [bundle.environment, bundle.content, projectName(bundle.projectId) ?? ""])),
    ...data.notes.map((note) => searchableEntry({
      id: note.id,
      kind: "note",
      label: note.title,
      context: [projectName(note.projectId), note.tags.join(", ")].filter(Boolean).join(" · "),
      href: `/notes?note=${encodeURIComponent(note.id)}`,
    }, [note.title, note.body, ...note.tags, projectName(note.projectId) ?? ""])),
    ...data.tasks.map((task) => searchableEntry({
      id: task.id,
      kind: "task",
      label: task.title,
      context: [projectName(task.projectId), categoryName(task.categoryId)]
        .filter(Boolean)
        .join(" · "),
      href: "/tasks",
    }, [
      task.title,
      task.description ?? "",
      task.dueDate ?? "",
      projectName(task.projectId) ?? "",
      categoryName(task.categoryId) ?? "",
    ])),
  ];
}

export function searchLocalIndex(
  index: readonly LocalSearchIndexEntry[],
  query: string,
  maximumResults: number,
): LocalSearchResult[] {
  const normalizedQuery = normalizeSearchText(query.trim());
  if (!normalizedQuery || maximumResults <= 0) return [];
  const tokens = normalizedQuery.split(/\s+/u).filter(Boolean);

  return index
    .map((entry, order) => {
      if (!tokens.every((token) => entry.normalizedSearchText.includes(token))) return null;
      const score = entry.normalizedLabel === normalizedQuery
        ? 4
        : entry.normalizedLabel.startsWith(normalizedQuery)
          ? 3
          : entry.normalizedLabel.includes(normalizedQuery)
            ? 2
            : 1;
      return { entry, score, order };
    })
    .filter((match): match is NonNullable<typeof match> => match !== null)
    .sort((left, right) => right.score - left.score || left.order - right.order)
    .slice(0, maximumResults)
    .map(({ entry }) => ({
      id: entry.id,
      kind: entry.kind,
      label: entry.label,
      ...(entry.context ? { context: entry.context } : {}),
      href: entry.href,
    }));
}
