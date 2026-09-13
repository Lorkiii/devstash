import type { TaskCategory, TaskCategoryColorToken } from "./vault-data.types";

export const TASK_CATEGORY_COLOR_TOKENS = [
  "blue",
  "cyan",
  "violet",
  "emerald",
  "amber",
  "rose",
  "slate",
] as const satisfies readonly TaskCategoryColorToken[];

export const BUILT_IN_TASK_CATEGORY_KEYS = ["WORK", "LIFESTYLE", "SPORTS"] as const;
export type BuiltInTaskCategoryKey = (typeof BUILT_IN_TASK_CATEGORY_KEYS)[number];

export const BUILT_IN_TASK_CATEGORIES = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    key: "WORK",
    name: "Work",
    colorToken: "blue",
    builtIn: true,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    key: "LIFESTYLE",
    name: "Lifestyle",
    colorToken: "violet",
    builtIn: true,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    key: "SPORTS",
    name: "Sports",
    colorToken: "emerald",
    builtIn: true,
  },
] as const satisfies readonly (TaskCategory & { key: BuiltInTaskCategoryKey })[];

export function isTaskCategoryColorToken(value: unknown): value is TaskCategoryColorToken {
  return typeof value === "string" &&
    (TASK_CATEGORY_COLOR_TOKENS as readonly string[]).includes(value);
}

export function builtInTaskCategoryById(id: string) {
  return BUILT_IN_TASK_CATEGORIES.find((category) => category.id === id) ?? null;
}

export function builtInTaskCategoryByKey(key: string) {
  return BUILT_IN_TASK_CATEGORIES.find((category) => category.key === key) ?? null;
}
