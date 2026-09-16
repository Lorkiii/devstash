import type { Project, Task, TaskCategory } from "@/app/lib/vault-data.types";
import type { TaskInput } from "@/app/lib/workspace.types";

export interface TaskFormProps {
  task?: Task;
  projects: Project[];
  /** Locks the relationship in project-scoped workspaces without a hidden input. */
  fixedProject?: Pick<Project, "id" | "name">;
  categories: TaskCategory[];
  defaultSortOrder: number;
  isSaving: boolean;
  requestError: string | null;
  onCancel: () => void;
  onSubmit: (input: TaskInput) => Promise<void>;
}
