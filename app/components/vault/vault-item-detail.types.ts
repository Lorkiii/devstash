import type { VaultItem } from "@/app/lib/vault-data.types";

export interface VaultItemDetailProps {
  item: VaultItem;
  projectName?: string;
  embedded?: boolean;
  isDeleting: boolean;
  actionError: string | null;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}
