import React from "react";
import type { VaultData } from "@/app/lib/vault-data.types";

interface WorkspaceInventoryProps {
  data: VaultData;
}

export function WorkspaceInventory({ data }: WorkspaceInventoryProps) {
  const inventory = [
    { label: "Secrets", value: data.secrets.length, tone: "text-accent-strong" },
    { label: ".env bundles", value: data.envBundles.length, tone: "text-cyan-700 dark:text-cyan-300" },
    { label: "Projects", value: data.projects.length, tone: "text-violet-700 dark:text-violet-300" },
    { label: "Notes", value: data.notes.length, tone: "text-amber-800 dark:text-amber-200" },
    { label: "Open tasks", value: data.tasks.filter((task) => !task.done).length, tone: "text-emerald-700 dark:text-emerald-300" },
  ];

  return (
    <section aria-labelledby="workspace-inventory-title" className="overflow-hidden rounded-xl border border-accent/20 bg-surface/85">
      <div className="border-b border-accent/10 px-3 py-2.5 sm:px-5 sm:py-3">
        <h2 id="workspace-inventory-title" className="text-sm font-semibold text-foreground sm:text-base">Workspace inventory</h2>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-5">
        {inventory.map((item) => (
          <div key={item.label} className="min-w-0 border-b border-r border-accent/10 px-3 py-3 last:col-span-2 last:border-r-0 [&:nth-child(even)]:border-r-0 sm:border-b-0 sm:px-4 sm:py-4 sm:last:col-span-1 sm:[&:nth-child(even)]:border-r sm:last:border-r-0">
            <dt className="font-mono text-[10px] uppercase tracking-wider text-subtle-foreground">{item.label}</dt>
            <dd className={`mt-1 text-xl font-bold tabular-nums ${item.tone}`}>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
