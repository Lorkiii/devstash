"use client";

import React from "react";
import { useUnlockedVault, useVaultSession } from "@/app/lib/vault-session";
import { VaultStatusPanel } from "@/app/components/dashboard/sections/vault-status-panel";
import { QuickActionsPanel } from "@/app/components/dashboard/sections/quick-actions-panel";
import { RecentPanel } from "@/app/components/dashboard/sections/recent-panel";
import { OpenTasksPanel } from "@/app/components/dashboard/sections/open-tasks-panel";
import { ProjectsStrip } from "@/app/components/dashboard/sections/projects-strip";
import { WorkspaceInventory } from "@/app/components/dashboard/sections/workspace-inventory";

export function DashboardOverview() {
  const data = useUnlockedVault();
  const { unlockedAt, secondsUntilAutoLock, autoLockMinutes, recents } = useVaultSession();

  return (
    <div className="space-y-3 pb-2 sm:space-y-5">
      <VaultStatusPanel
        unlockedAt={unlockedAt}
        secondsUntilAutoLock={secondsUntilAutoLock}
        autoLockMinutes={autoLockMinutes}
      />

      <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <OpenTasksPanel data={data} limit={4} />
        </div>
        <div className="xl:col-span-5">
          <RecentPanel data={data} recents={recents} limit={4} />
        </div>
      </div>

      <QuickActionsPanel />
      <WorkspaceInventory data={data} />
      <ProjectsStrip data={data} limit={3} />
    </div>
  );
}
