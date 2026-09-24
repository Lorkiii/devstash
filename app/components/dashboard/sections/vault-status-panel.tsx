"use client";

import React, { useEffect, useState } from "react";
import { Clock3, LockKeyhole } from "lucide-react";
import { formatCountdown, formatElapsed } from "@/app/lib/format";

interface VaultStatusPanelProps {
  unlockedAt: number | null;
  secondsUntilAutoLock: number | null;
  autoLockMinutes: number;
}

export function VaultStatusPanel({
  unlockedAt,
  secondsUntilAutoLock,
  autoLockMinutes,
}: VaultStatusPanelProps) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(tick);
  }, []);

  return (
    <section
      aria-labelledby="dashboard-title"
      className="relative overflow-hidden rounded-xl border border-accent/25 bg-surface/90 shadow-[0_10px_32px_rgba(0,0,0,0.14)]"
    >
      <div className="absolute inset-y-0 left-0 w-px bg-accent/70" aria-hidden="true" />
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-emerald-700 dark:text-emerald-300">
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
            LOCAL SESSION ACTIVE
          </div>
          <h1 id="dashboard-title" className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Vault command center<span className="text-accent">.</span>
          </h1>
          <p className="mt-1 max-w-prose text-xs leading-5 text-muted-foreground sm:text-sm">
            Pick up private work or capture something new. Decrypted content disappears when the vault locks.
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-2 font-mono text-[10px] sm:max-w-md lg:w-full lg:shrink-0">
          <div className="min-w-0 rounded-lg bg-surface-inset/65 px-3 py-2.5">
            <dt className="flex items-center gap-1.5 uppercase tracking-wider text-subtle-foreground">
              <Clock3 className="h-3 w-3 text-accent" aria-hidden="true" /> Unlocked
            </dt>
            <dd className="mt-1 text-xs font-semibold text-foreground sm:text-sm">
              {unlockedAt ? formatElapsed(unlockedAt, now) : "—"}
            </dd>
          </div>
          <div className="min-w-0 rounded-lg bg-surface-inset/65 px-3 py-2.5">
            <dt className="flex items-center gap-1.5 uppercase tracking-wider text-subtle-foreground">
              <LockKeyhole className="h-3 w-3 text-accent" aria-hidden="true" /> Idle lock
            </dt>
            <dd className="mt-1 text-xs font-semibold tabular-nums text-foreground sm:text-sm">
              {secondsUntilAutoLock !== null ? formatCountdown(secondsUntilAutoLock) : "—"}
              <span className="ml-1 font-normal text-subtle-foreground">/ {autoLockMinutes} min</span>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
