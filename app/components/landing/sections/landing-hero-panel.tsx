"use client";

import React from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
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
    <div className="flex flex-col gap-8 sm:gap-10">
      <div className="space-y-6">
        <h1 className="landing-headline max-w-3xl font-semibold tracking-[-0.04em] text-foreground">
          Your private work,
          <br />
          <span className="text-accent-strong">
            encrypted first.
          </span>
        </h1>

        <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          Keep credentials, .env bundles, private notes, projects, and tasks in
          one vault-first workspace. Google verifies your identity; a separate
          Vault Passphrase unlocks your encrypted data locally.
        </p>
      </div>

      <div className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
          <button
            type="button"
            onClick={onSignInClick}
            className="group inline-flex min-h-13 cursor-pointer items-center justify-center gap-5 rounded-lg bg-accent-strong px-6 py-3 text-xs font-bold tracking-[0.06em] text-accent-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent motion-reduce:transition-none"
          >
            <span>OPEN YOUR VAULT</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onOpenEnvelopeModal}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md px-1 text-xs font-semibold tracking-[0.04em] text-muted-foreground underline decoration-border underline-offset-6 transition-colors hover:text-foreground hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent motion-reduce:transition-none"
          >
            SEE THE ENCRYPTION FLOW
          </button>
        </div>
        <p className="flex items-center gap-2 text-[10px] font-medium leading-5 tracking-[0.06em] text-muted-foreground sm:text-[11px]">
          <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-accent-strong" aria-hidden="true" />
          CLIENT-SIDE ENCRYPTED · PRIVATE BY DESIGN
        </p>
      </div>

      <div className="border-t border-border/60 pt-6 sm:pt-7">
        <p className="mb-5 text-[10px] font-medium leading-5 tracking-[0.1em] text-subtle-foreground sm:text-[11px]">
          ONE PRIVATE WORKSPACE / THREE DISTINCT STEPS
        </p>
        <ol className="grid grid-cols-3 gap-4 sm:gap-5">
          {ACCESS_STEPS.map((step) => (
            <li key={step.number} className="min-w-0">
              <span className="mb-2 block font-mono text-xs text-accent-strong">{step.number}</span>
              <span>
                <span className="block text-[11px] font-semibold tracking-[0.06em] text-foreground">
                  {step.label}
                </span>
                <span className="mt-1.5 block text-xs leading-5 text-muted-foreground sm:text-sm">
                  {step.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
