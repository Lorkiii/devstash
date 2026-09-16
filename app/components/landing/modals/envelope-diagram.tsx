"use client";

import React, { useState } from "react";
import { UnlockIcon, KeyIcon, CpuIcon, DatabaseIcon, ShieldLockIcon } from "@/app/components/ui/icons";
import type { Step } from "./envelope-diagram.types";

const ENVELOPE_STEPS: Step[] = [
  {
    id: "passphrase",
    title: "1. Vault Passphrase",
    subtitle: "Client Memory Only",
    badge: "EPHEMERAL",
    detail:
      "Collected locally to derive keys. Never sent over the network, never stored in cookies, localStorage, or server logs.",
    icon: <KeyIcon className="w-4 h-4 text-accent" />,
    clientOnly: true,
  },
  {
    id: "kdf",
    title: "2. Argon2id KDF",
    subtitle: "Memory-hard KDF",
    badge: "CLIENT KDF",
    detail:
      "Derives a 256-bit Key Encryption Key (KEK) using a cryptographically secure random salt directly in the browser WebAssembly runtime.",
    icon: <CpuIcon className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
    clientOnly: true,
  },
  {
    id: "dek",
    title: "3. Wrapped DEK",
    subtitle: "AES-256-GCM Key Wrap",
    badge: "LOCAL UNWRAP",
    detail:
      "The KEK authentically unwraps the Data Encryption Key (DEK). DEK remains strictly in transient browser memory while the vault is unlocked.",
    icon: <UnlockIcon className="w-4 h-4 text-accent" />,
    clientOnly: true,
  },
  {
    id: "payload",
    title: "4. Record Encryption",
    subtitle: "AES-256-GCM + Nonce",
    badge: "128-BIT AUTH TAG",
    detail:
      "Every secret, .env bundle, note, and task is encrypted with a unique 96-bit random nonce and bound with Authenticated Additional Data (AAD).",
    icon: <ShieldLockIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
    clientOnly: true,
  },
  {
    id: "server",
    title: "5. Neon Storage",
    subtitle: "Ciphertext at Rest",
    badge: "CIPHERTEXT ONLY",
    detail:
      "The server and Neon Postgres database receive and store only ciphertext, salts, and nonces. The server has no ability to decrypt.",
    icon: <DatabaseIcon className="h-4 w-4 text-violet-600 dark:text-violet-400" />,
    clientOnly: false,
  },
];

export function EnvelopeDiagram() {
  const [activeStep, setActiveStep] = useState<number>(0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[11px] font-mono tracking-wider text-accent">
        <span>ENVELOPE ENCRYPTION ARCHITECTURE</span>
        <span className="text-zinc-500">AES-256-GCM + ARGON2ID</span>
      </div>

      {/* Step Sequence */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {ENVELOPE_STEPS.map((step, idx) => {
          const isSelected = activeStep === idx;
          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(idx)}
              className={`text-left p-2.5 rounded transition-all duration-200 border flex flex-col justify-between ${
                isSelected
                  ? "border-accent bg-accent/12 shadow-[0_0_12px_rgba(110,168,255,0.25)]"
                  : "border-accent/15 bg-surface/70 hover:border-accent/35 hover:bg-surface-strong"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                {step.icon}
                <span
                  className={`text-[9px] font-mono px-1 py-0.5 rounded uppercase ${
                    step.clientOnly
                      ? "text-accent bg-accent/10 border border-accent/20"
                      : "text-amber-400 bg-amber-400/10 border border-amber-400/20"
                  }`}
                >
                  {step.clientOnly ? "BROWSER" : "NEON"}
                </span>
              </div>
              <div className="text-xs font-semibold text-foreground truncate">
                {step.title}
              </div>
              <div className="text-[10px] font-mono text-subtle-foreground truncate mt-0.5">
                {step.subtitle}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Step Deep Dive Box */}
      <div className="relative overflow-hidden rounded border border-accent/25 bg-surface-muted/90 p-3.5 backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <h4 className="text-xs font-mono font-bold tracking-wider text-foreground uppercase">
              {ENVELOPE_STEPS[activeStep].title} — {ENVELOPE_STEPS[activeStep].subtitle}
            </h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent/15 text-accent border border-accent/30">
            {ENVELOPE_STEPS[activeStep].badge}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed font-sans">
          {ENVELOPE_STEPS[activeStep].detail}
        </p>
      </div>
    </div>
  );
}
