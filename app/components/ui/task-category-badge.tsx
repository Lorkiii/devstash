import type { TaskCategoryColorToken } from "@/app/lib/vault-data.types";
import type { TaskCategoryBadgeProps } from "./task-category-badge.types";

const COLOR_CLASSES: Record<TaskCategoryColorToken, string> = {
  blue: "border-accent/45 bg-accent/12 text-accent-strong",
  cyan: "border-cyan-400/45 bg-cyan-400/10 text-cyan-200",
  violet: "border-violet-400/45 bg-violet-400/10 text-violet-200",
  emerald: "border-emerald-400/45 bg-emerald-400/10 text-emerald-200",
  amber: "border-amber-400/45 bg-amber-400/10 text-amber-200",
  rose: "border-rose-400/45 bg-rose-400/10 text-rose-200",
  slate: "border-slate-400/40 bg-slate-400/10 text-slate-200",
};

export function TaskCategoryBadge({ category, className = "" }: TaskCategoryBadgeProps) {
  const colorClass = category ? COLOR_CLASSES[category.colorToken] : COLOR_CLASSES.slate;
  return (
    <span
      className={`inline-flex max-w-full items-center rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wider ${colorClass} ${className}`}
    >
      <span className="truncate">{category?.name ?? "Uncategorized"}</span>
    </span>
  );
}
