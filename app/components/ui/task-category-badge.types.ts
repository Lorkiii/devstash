import type { TaskCategory } from "@/app/lib/vault-data.types";

export interface TaskCategoryBadgeProps {
  category?: TaskCategory | null;
  className?: string;
}
