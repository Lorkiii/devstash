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
    icon: <KeyIcon className="w-4 h-4 text-[#6ea8ff]" />,
    clientOnly: true,
  },
  {
    id: "kdf",
    title: "2. Argon2id KDF",
    subtitle: "Memory-hard KDF",
    badge: "CLIENT KDF",
    detail:
      "Derives a 256-bit Key Encryption Key (KEK) using a cryptographically secure random salt directly in the browser WebAssembly runtime.",
    icon: <CpuIcon className="w-4 h-4 text-[#38bdf8]" />,
    clientOnly: true,
  },
  {
    id: "dek",
    title: "3. Wrapped DEK",
    subtitle: "AES-256-GCM Key Wrap",
    badge: "LOCAL UNWRAP",
    detail:
      "The KEK authentically unwraps the Data Encryption Key (DEK). DEK remains strictly in transient browser memory while the vault is unlocked.",
    icon: <UnlockIcon className="w-4 h-4 text-[#6ea8ff]" />,
    clientOnly: true,
  },
  {
    id: "payload",
    title: "4. Record Encryption",
    subtitle: "AES-256-GCM + Nonce",
    badge: "128-BIT AUTH TAG",
    detail:
      "Every secret, .env bundle, note, and task is encrypted with a unique 96-bit random nonce and bound with Authenticated Additional Data (AAD).",
    icon: <ShieldLockIcon className="w-4 h-4 text-[#10b981]" />,
    clientOnly: true,
  },
  {
    id: "server",
    title: "5. Neon Storage",
    subtitle: "Ciphertext at Rest",
    badge: "CIPHERTEXT ONLY",
    detail:
      "The server and Neon Postgres database receive and store only ciphertext, salts, and nonces. The server has no ability to decrypt.",
    icon: <DatabaseIcon className="w-4 h-4 text-[#a78bfa]" />,
    clientOnly: false,
  },
];

export function EnvelopeDiagram() {
  const [activeStep, setActiveStep] = useState<number>(0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[11px] font-mono tracking-wider text-[#6ea8ff]">
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
                  ? "bg-[#0f1d36] border-[#6ea8ff] shadow-[0_0_12px_rgba(110,168,255,0.25)]"
                  : "bg-[#0a1220]/70 border-[#6ea8ff]/15 hover:border-[#6ea8ff]/35 hover:bg-[#0d182a]"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                {step.icon}
                <span
                  className={`text-[9px] font-mono px-1 py-0.5 rounded uppercase ${
                    step.clientOnly
                      ? "text-[#6ea8ff] bg-[#6ea8ff]/10 border border-[#6ea8ff]/20"
                      : "text-amber-400 bg-amber-400/10 border border-amber-400/20"
                  }`}
                >
                  {step.clientOnly ? "BROWSER" : "NEON"}
                </span>
              </div>
              <div className="text-xs font-semibold text-[#e8eefb] truncate">
                {step.title}
              </div>
              <div className="text-[10px] font-mono text-[#e8eefb]/50 truncate mt-0.5">
                {step.subtitle}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Step Deep Dive Box */}
      <div className="p-3.5 rounded border border-[#6ea8ff]/25 bg-[#0a1424]/90 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#6ea8ff]/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#6ea8ff] animate-pulse" />
            <h4 className="text-xs font-mono font-bold tracking-wider text-[#e8eefb] uppercase">
              {ENVELOPE_STEPS[activeStep].title} — {ENVELOPE_STEPS[activeStep].subtitle}
            </h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#6ea8ff]/15 text-[#6ea8ff] border border-[#6ea8ff]/30">
            {ENVELOPE_STEPS[activeStep].badge}
          </span>
        </div>
        <p className="text-xs text-[#e8eefb]/75 leading-relaxed font-sans">
          {ENVELOPE_STEPS[activeStep].detail}
        </p>
      </div>
    </div>
  );
}
