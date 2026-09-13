import type { Project } from "@/app/lib/vault-data.types";
import type { ProjectInput } from "@/app/lib/workspace.types";

export interface ProjectFormProps {
  project?: Project;
  isSaving: boolean;
  requestError: string | null;
  onCancel: () => void;
  onSubmit: (input: ProjectInput) => Promise<void>;
}
