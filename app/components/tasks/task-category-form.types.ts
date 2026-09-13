import type { TaskCategory } from "@/app/lib/vault-data.types";
import type { TaskCategoryInput } from "@/app/lib/workspace.types";

export interface TaskCategoryFormProps {
  category?: TaskCategory;
  isSaving: boolean;
  requestError: string | null;
  onCancel: () => void;
  onSubmit: (input: TaskCategoryInput) => Promise<void>;
}
