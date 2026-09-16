"use client";

import React from "react";
import { useUnlockedVault, useVaultSession } from "@/app/lib/vault-session";
import { VaultStatusPanel } from "@/app/components/dashboard/sections/vault-status-panel";
import { QuickActionsPanel } from "@/app/components/dashboard/sections/quick-actions-panel";
import { RecentPanel } from "@/app/components/dashboard/sections/recent-panel";
import { OpenTasksPanel } from "@/app/components/dashboard/sections/open-tasks-panel";
import { ProjectsStrip } from "@/app/components/dashboard/sections/projects-strip";

export function DashboardOverview() {
  const data = useUnlockedVault();
  const { unlockedAt, secondsUntilAutoLock, autoLockMinutes, recents } = useVaultSession();

  return (
    <div className="space-y-5 pb-2">
      <VaultStatusPanel
        data={data}
        unlockedAt={unlockedAt}
        secondsUntilAutoLock={secondsUntilAutoLock}
        autoLockMinutes={autoLockMinutes}
      />

      <QuickActionsPanel />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <RecentPanel data={data} recents={recents} />
        </div>
        <div className="xl:col-span-5">
          <OpenTasksPanel data={data} />
        </div>
      </div>

      <ProjectsStrip data={data} />
    </div>
  );
}
