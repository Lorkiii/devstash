import type { EnvBundle } from "@/app/lib/vault-data.types";
import type { EnvBundleInput } from "@/app/lib/workspace.types";

export interface EnvBundleFormProps {
  projectId: string;
  bundle?: EnvBundle;
  isSaving: boolean;
  requestError: string | null;
  onCancel: () => void;
  onSubmit: (input: EnvBundleInput) => Promise<void>;
}
