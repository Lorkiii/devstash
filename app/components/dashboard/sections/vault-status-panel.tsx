"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3, LockKeyhole, ShieldCheck } from "lucide-react";
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
  const openTasks = data.tasks.filter((task) => !task.done).length;
  const recordCount =
    data.secrets.length + data.envBundles.length + data.projects.length + data.notes.length + data.tasks.length;

  const inventory = [
    { label: "Secrets", value: data.secrets.length, accent: "text-accent" },
    { label: ".env bundles", value: data.envBundles.length, accent: "text-cyan-300" },
    { label: "Projects", value: data.projects.length, accent: "text-violet-300" },
    { label: "Notes", value: data.notes.length, accent: "text-amber-200" },
    { label: "Open tasks", value: openTasks, accent: "text-emerald-300" },
  ];
  const sessionDetails = [
    { label: "Unlocked", value: unlockedAt ? formatElapsed(unlockedAt, now) : "—" },
    {
      label: "Auto-lock",
      value:
        secondsUntilAutoLock !== null
          ? `${formatCountdown(secondsUntilAutoLock)} · ${autoLockMinutes} min idle`
          : "—",
    },
  ];

  return (
    <section
      aria-labelledby="dashboard-title"
      className="relative isolate overflow-hidden rounded-xl border border-accent/25 bg-surface/90 shadow-[0_24px_80px_rgba(0,0,0,0.48)]"
    >
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(110,168,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(110,168,255,0.08)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(to_right,black,transparent_76%)]" />
      <div className="pointer-events-none absolute -right-28 -top-52 h-[520px] w-[520px] rounded-full border border-accent/15 bg-accent/5 blur-[1px]" />
      <div className="pointer-events-none absolute right-16 top-10 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative grid min-h-[360px] lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <div className="flex flex-col justify-between px-5 py-6 sm:px-7 sm:py-8 lg:px-9 lg:py-10">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-accent-strong">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
                LOCAL SESSION ACTIVE
              </span>
              <span className="text-subtle-foreground">{"// COMMAND DECK"}</span>
            </div>

            <p className="mb-2 font-mono text-xs tracking-[0.16em] text-subtle-foreground">WELCOME TO YOUR</p>
            <h1 id="dashboard-title" className="max-w-3xl text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl lg:text-5xl">
              Vault command center<span className="text-accent">.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Navigate your private developer workspace, capture the next idea, and close the loop on active work.
              Decrypted content disappears when this vault locks.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <Link
                href="/vault"
                className="group inline-flex min-h-11 items-center gap-2 rounded border border-accent/50 bg-accent/15 px-4 font-mono text-xs font-bold tracking-wider text-foreground transition-colors hover:bg-accent/25"
              >
                OPEN VAULT
                <ArrowUpRight className="h-3.5 w-3.5 text-accent-strong transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/settings"
                className="inline-flex min-h-11 items-center gap-2 rounded border border-foreground/15 bg-surface-inset/55 px-4 font-mono text-xs tracking-wider text-muted-foreground transition-colors hover:border-accent/35 hover:text-foreground"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                SECURITY &amp; BACKUP
              </Link>
            </div>
          </div>

          <dl className="mt-8 grid max-w-xl gap-2 font-mono text-[10px] sm:grid-cols-2">
            {sessionDetails.map((detail) => (
              <div key={detail.label} className="flex items-center justify-between gap-3 border-l border-accent/30 bg-surface-inset/45 px-3 py-2.5">
                <dt className="flex items-center gap-2 uppercase tracking-widest text-subtle-foreground">
                  <Clock3 className="h-3 w-3 text-accent" />
                  {detail.label}
                </dt>
                <dd className="text-right text-muted-foreground">{detail.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative flex items-center justify-center border-t border-accent/15 px-5 py-8 lg:border-l lg:border-t-0">
          <div className="relative flex aspect-square w-full max-w-[300px] items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-accent/15" />
            <div className="absolute inset-[10%] rounded-full border border-dashed border-accent/25" />
            <div className="absolute inset-[22%] rounded-full border border-accent/25 bg-surface-inset/70 shadow-[0_0_50px_rgba(110,168,255,0.12)]" />
            <div className="absolute left-1/2 top-0 h-full w-px bg-gradient-to-b from-transparent via-accent/20 to-transparent" />
            <div className="absolute left-0 top-1/2 h-px w-full bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

            <div className="relative z-10 flex h-[42%] w-[42%] flex-col items-center justify-center rounded-full border border-emerald-500/30 bg-surface-inset text-center shadow-[0_0_40px_rgba(52,211,153,0.12)]">
              <LockKeyhole className="mb-2 h-5 w-5 text-emerald-300" />
              <strong className="text-3xl font-black tracking-tight text-foreground">{recordCount}</strong>
              <span className="font-mono text-[9px] tracking-[0.18em] text-subtle-foreground">LOCAL RECORDS</span>
            </div>

            <span className="absolute left-[4%] top-[45%] rounded-full border border-accent/20 bg-surface-muted px-2 py-1 font-mono text-[9px] tracking-widest text-accent-strong">
              AES-GCM
            </span>
            <span className="absolute right-[3%] top-[24%] rounded-full border border-emerald-400/20 bg-surface-muted px-2 py-1 font-mono text-[9px] tracking-widest text-emerald-200">
              IN MEMORY
            </span>
            <span className="absolute bottom-[9%] right-[13%] rounded-full border border-foreground/15 bg-surface-muted px-2 py-1 font-mono text-[9px] tracking-widest text-muted-foreground">
              TAB LOCAL
            </span>
          </div>
        </div>
      </div>

      <dl className="relative grid border-t border-accent/15 bg-surface-inset/65 sm:grid-cols-2 lg:grid-cols-5">
        {inventory.map((item) => (
          <div key={item.label} className="flex items-end justify-between gap-3 border-b border-accent/10 px-5 py-4 last:border-b-0 sm:border-r sm:[&:nth-child(even)]:border-r-0 lg:border-b-0 lg:[&:nth-child(even)]:border-r lg:last:border-r-0">
            <dt className="font-mono text-[9px] uppercase tracking-[0.17em] text-subtle-foreground">{item.label}</dt>
            <dd className={`text-2xl font-black leading-none ${item.accent}`}>{item.value}</dd>
          </div>
        ))}
      </dl>

      {data.secrets.length > 0 && (
        <div className="relative flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-accent/10 px-5 py-3 font-mono text-[9px] tracking-widest text-subtle-foreground">
          <span>SECRET SIGNALS</span>
          {countsByType.filter((entry) => entry.count > 0).map(({ type, count }) => {
            const meta = VAULT_TYPE_META[type];
            return (
              <span key={type} className={`inline-flex items-center gap-1.5 ${meta.textClass}`}>
                <span className="h-1 w-1 rounded-full bg-current" />
                {meta.short} {count}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}
