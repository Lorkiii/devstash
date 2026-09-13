import type { Project, VaultItem } from "@/app/lib/vault-data.types";
import type { GenericSecretInput } from "@/app/lib/vault-item.types";

export interface GenericSecretFormProps {
  item?: VaultItem;
  projects: Project[];
  isSaving: boolean;
  requestError: string | null;
  onCancel: () => void;
  onSubmit: (input: GenericSecretInput) => Promise<void>;
}
