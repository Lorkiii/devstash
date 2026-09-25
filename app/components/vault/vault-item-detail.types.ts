import type { RefObject } from "react";
import type { VaultItem } from "@/app/lib/vault-data.types";

export interface VaultItemDetailProps {
  item: VaultItem;
  projectName?: string;
  isDeleting: boolean;
  actionError: string | null;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}
