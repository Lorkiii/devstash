import type { EnvBundle } from "@/app/lib/vault-data.types";

export interface EnvBundleViewerProps {
  bundle: EnvBundle;
  revealSeconds?: number;
  embedded?: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}
