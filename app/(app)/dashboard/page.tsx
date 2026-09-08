"use client";

import React from "react";
import { useUnlockedVault, useVaultSession } from "@/app/lib/vault-session";
import { PageHeading } from "@/app/components/ui/page-heading";
import { VaultStatusPanel } from "@/app/components/dashboard/sections/vault-status-panel";
import { QuickActionsPanel } from "@/app/components/dashboard/sections/quick-actions-panel";
import { RecentPanel } from "@/app/components/dashboard/sections/recent-panel";
import { OpenTasksPanel } from "@/app/components/dashboard/sections/open-tasks-panel";
import { ProjectsStrip } from "@/app/components/dashboard/sections/projects-strip";

export default function DashboardPage() {
  const data = useUnlockedVault();
  const { unlockedAt, secondsUntilAutoLock, autoLockMinutes, recents } = useVaultSession();

  return (
    <div className="space-y-4">
      <PageHeading
        eyebrow="OVERVIEW"
        title="Dashboard"
        description="Everything below is decrypted in this tab only and disappears on lock."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4">
          <VaultStatusPanel
            data={data}
            unlockedAt={unlockedAt}
            secondsUntilAutoLock={secondsUntilAutoLock}
            autoLockMinutes={autoLockMinutes}
          />
        </div>
        <div className="lg:col-span-8">
          <QuickActionsPanel />
        </div>
        <div className="lg:col-span-6">
          <RecentPanel data={data} recents={recents} />
        </div>
        <div className="lg:col-span-6">
          <OpenTasksPanel data={data} />
        </div>
        <div className="lg:col-span-12">
          <ProjectsStrip data={data} />
        </div>
      </div>
    </div>
  );
}
