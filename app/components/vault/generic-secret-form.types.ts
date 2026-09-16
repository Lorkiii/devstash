import type { Project, VaultItem } from "@/app/lib/vault-data.types";
import type { GenericSecretInput } from "@/app/lib/vault-item.types";

export interface GenericSecretFormProps {
  item?: VaultItem;
  projects: Project[];
  /** Locks the relationship in project-scoped workspaces without a hidden input. */
  fixedProject?: Pick<Project, "id" | "name">;
  isSaving: boolean;
  requestError: string | null;
  onCancel: () => void;
  onSubmit: (input: GenericSecretInput) => Promise<void>;
}
