"use client";

import React from "react";
import { ArrowUpRightIcon } from "@/app/components/ui/icons";
import type { LandingHeroPanelProps } from "./landing-hero-panel.types";

const ACCESS_STEPS = [
  { number: "01", label: "IDENTITY", detail: "Google verifies you" },
  { number: "02", label: "UNLOCK", detail: "Passphrase stays local" },
  { number: "03", label: "WORKSPACE", detail: "Browser decrypts" },
];

export function LandingHeroPanel({
  onOpenEnvelopeModal,
  onSignInClick,
}: LandingHeroPanelProps) {
  return (
    <div className="flex flex-col gap-7 lg:gap-9">
      <div className="space-y-4">
        <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-accent-strong shadow-[inset_0_0_16px_rgba(110,168,255,0.06)]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]" />
          <span className="min-w-0">CLIENT-SIDE ENCRYPTED · PRIVATE BY DESIGN</span>
        </div>

        <h1 className="max-w-3xl text-4xl font-extrabold leading-[0.98] tracking-[-0.04em] text-foreground sm:text-5xl xl:text-6xl 2xl:text-7xl">
          Your private work,
          <br />
          <span className="bg-gradient-to-r from-accent via-accent-strong to-foreground bg-clip-text text-transparent">
            encrypted first.
          </span>
        </h1>

        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
          Keep credentials, .env bundles, private notes, projects, and tasks in
          one vault-first workspace. Google verifies your identity; a separate
          Vault Passphrase unlocks your encrypted data locally.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={onSignInClick}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-foreground px-5 py-2.5 font-mono text-xs font-bold tracking-[0.12em] text-background shadow-[0_10px_30px_rgba(110,168,255,0.16)] transition-all duration-200 hover:bg-accent-strong hover:text-accent-foreground hover:shadow-[0_12px_36px_rgba(110,168,255,0.28)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none cursor-pointer"
        >
          <span>OPEN YOUR VAULT</span>
          <ArrowUpRightIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onOpenEnvelopeModal}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-accent/30 bg-surface/70 px-5 py-2.5 font-mono text-xs font-semibold tracking-[0.12em] text-foreground transition-all duration-200 hover:border-accent/70 hover:bg-surface-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none cursor-pointer"
        >
          SEE THE ENCRYPTION FLOW
        </button>
      </div>

      <div className="border-y border-accent/20 py-4 sm:py-5">
        <p className="mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] text-accent-strong">
          ONE PRIVATE WORKSPACE / THREE DISTINCT STEPS
        </p>
        <ol className="grid gap-4 sm:grid-cols-3 sm:gap-2">
          {ACCESS_STEPS.map((step) => (
            <li key={step.number} className="flex min-w-0 items-start gap-2.5 font-mono">
              <span className="text-xs font-bold text-accent-strong">{step.number}</span>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold tracking-[0.12em] text-foreground">
                  {step.label}
                </span>
                <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                  {step.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex items-center gap-3 font-mono text-[10px] font-semibold tracking-[0.16em] text-accent-strong">
        <span>EXPLORE THE SAMPLE WORKSPACE</span>
        <span className="h-px min-w-6 flex-1 bg-gradient-to-r from-accent/45 to-transparent" />
        <span aria-hidden="true" className="text-base leading-none">↗</span>
      </div>
    </div>
  );
}
