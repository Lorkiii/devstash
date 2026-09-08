"use client";

import React, { useEffect, useState } from "react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import type { VaultData } from "@/app/lib/vault-data.types";
import { VAULT_TYPE_META, VAULT_TYPE_ORDER } from "@/app/lib/vault-types";
import { formatCountdown, formatElapsed } from "@/app/lib/format";

interface VaultStatusPanelProps {
  data: VaultData;
  unlockedAt: number | null;
  secondsUntilAutoLock: number | null;
  autoLockMinutes: number;
}

export function VaultStatusPanel({
  data,
  unlockedAt,
  secondsUntilAutoLock,
  autoLockMinutes,
}: VaultStatusPanelProps) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(tick);
  }, []);

  const countsByType = VAULT_TYPE_ORDER.map((type) => ({
    type,
    count: data.secrets.filter((item) => item.type === type).length,
  }));
  const maxCount = Math.max(1, ...countsByType.map((entry) => entry.count));

  const rows = [
    { label: "profile", value: "argon2id · aes-256-gcm · v1 (planned)" },
    { label: "unlocked", value: unlockedAt ? formatElapsed(unlockedAt, now) : "—" },
    {
      label: "auto-lock",
      value:
        secondsUntilAutoLock !== null
          ? `${formatCountdown(secondsUntilAutoLock)} · ${autoLockMinutes} min idle`
          : "—",
    },
    { label: ".env bundles", value: String(data.envBundles.length) },
  ];

  return (
    <ConsolePanel title="VAULT STATUS" status="IN MEMORY" tone="green" className="h-full">
      <dl className="space-y-1.5 text-xs mb-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-[#e8eefb]/45 text-[10px] tracking-widest uppercase">{row.label}</dt>
            <dd className="text-[#e8eefb]/85 text-right truncate">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="text-[10px] tracking-widest text-[#e8eefb]/45 mb-2">SECRETS BY TYPE</div>
      <ul className="space-y-1.5">
        {countsByType.map(({ type, count }) => {
          const meta = VAULT_TYPE_META[type];
          return (
            <li key={type} className="grid grid-cols-[72px_1fr_20px] items-center gap-2 text-[10px]">
              <span className={`tracking-widest ${meta.textClass}`}>{meta.short}</span>
              <span className="h-1.5 rounded-full bg-[#070d18] overflow-hidden">
                <span
                  className={`block h-full rounded-full ${meta.barClass}`}
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </span>
              <span className="text-right text-[#e8eefb]/70">{count}</span>
            </li>
          );
        })}
      </ul>
    </ConsolePanel>
  );
}
