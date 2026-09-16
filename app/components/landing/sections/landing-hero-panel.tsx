"use client";

import React from "react";
import { FeaturePillars } from "./feature-pillars";
import { ArrowUpRightIcon, CheckIcon } from "@/app/components/ui/icons";
import type { LandingHeroPanelProps } from "./landing-hero-panel.types";

const TRUST_SIGNALS = [
  "IDENTITY AND VAULT UNLOCK STAY SEPARATE",
  "PLAINTEXT STAYS IN BROWSER MEMORY",
  "THE SERVER STORES CIPHERTEXT ONLY",
];

export function LandingHeroPanel({
  onOpenEnvelopeModal,
  onSignInClick,
}: LandingHeroPanelProps) {
  return (
    <div className="flex flex-col gap-6 lg:gap-7">
      <div className="space-y-4">
        <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-accent-strong shadow-[inset_0_0_16px_rgba(110,168,255,0.06)]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]" />
          <span className="min-w-0">CLIENT-SIDE ENCRYPTED · PRIVATE BY DESIGN</span>
        </div>

        <h1 className="max-w-3xl text-4xl font-extrabold leading-[0.98] tracking-[-0.04em] text-foreground sm:text-5xl lg:text-6xl xl:text-7xl">
          Your private work,
          <br />
          <span className="bg-gradient-to-r from-accent via-accent-strong to-foreground bg-clip-text text-transparent">
            encrypted first.
          </span>
        </h1>

        <p className="max-w-2xl text-sm leading-6 text-foreground/68 sm:text-base sm:leading-7">
          Keep credentials, .env bundles, private notes, projects, and tasks in
          one vault-first workspace. Google verifies your identity; a separate
          Vault Passphrase unlocks your encrypted data locally.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={onSignInClick}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-foreground px-5 py-2.5 font-mono text-xs font-bold tracking-[0.12em] text-background shadow-[0_10px_30px_rgba(110,168,255,0.16)] transition-all duration-200 hover:bg-accent-strong hover:text-accent-foreground hover:shadow-[0_12px_36px_rgba(110,168,255,0.28)] cursor-pointer"
        >
          <span>OPEN YOUR VAULT</span>
          <ArrowUpRightIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onOpenEnvelopeModal}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-accent/30 bg-surface/70 px-5 py-2.5 font-mono text-xs font-semibold tracking-[0.12em] text-foreground transition-all duration-200 hover:border-accent/70 hover:bg-surface-strong hover:text-foreground cursor-pointer"
        >
          SEE THE ENCRYPTION FLOW
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {TRUST_SIGNALS.map((signal) => (
          <div
            key={signal}
            className="flex items-start gap-2 border-l border-accent/25 px-3 py-1.5 font-mono text-[9px] leading-4 tracking-[0.08em] text-subtle-foreground"
          >
            <CheckIcon className="mt-0.5 h-3 w-3 shrink-0 text-emerald-300" />
            <span>{signal}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.16em] text-subtle-foreground">
          <span>ONE WORKSPACE · FOUR PRIVATE LAYERS</span>
          <span className="h-px flex-1 bg-gradient-to-r from-accent/25 to-transparent" />
        </div>
        <FeaturePillars />
      </div>
    </div>
  );
}
