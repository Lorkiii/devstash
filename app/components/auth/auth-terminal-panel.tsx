"use client";

import React, { useState } from "react";
import { GoogleIcon, ShieldLockIcon } from "@/app/components/ui/icons";
import type { AuthTerminalPanelProps } from "./auth-terminal-panel.types";

// Plain description of the two independent gates: Google identity, then the
// local Vault Passphrase. Sign-in never unlocks the vault on its own.
const ACCESS_STEPS = [
  {
    code: "01",
    label: "IDENTITY",
    value: "Google sign-in, allowlisted account only",
  },
  {
    code: "02",
    label: "VAULT PASSPHRASE",
    value: "Derives the key locally with Argon2id; never sent to the server",
  },
  {
    code: "03",
    label: "DATA",
    value: "Encrypted in the browser with AES-256-GCM; server stores ciphertext only",
  },
];

export function AuthTerminalPanel({ onGoogleSignIn }: AuthTerminalPanelProps) {
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  const handleSignIn = () => {
    setIsSigningIn(true);
    onGoogleSignIn();
  };

  return (
    <div className="w-full rounded-lg border border-[#6ea8ff]/30 bg-[#0a1220]/85 backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.6),0_0_30px_rgba(110,168,255,0.12)] p-4 sm:p-5 font-mono text-[#e8eefb] relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#6ea8ff]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-[#6ea8ff]/20 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-xs font-bold tracking-widest text-[#6ea8ff]">
            VAULT ACCESS
          </span>
        </div>
        <div className="text-[10px] text-[#e8eefb]/60 tracking-wider">
          SIGNED OUT · LOCKED
        </div>
      </div>

      <div className="space-y-3">
        {/* Access Steps */}
        <div className="space-y-1 bg-[#070d18]/90 p-3 rounded border border-[#6ea8ff]/15">
          <div className="text-[10px] tracking-widest text-[#e8eefb]/45 pb-1 border-b border-white/5">
            HOW ACCESS WORKS
          </div>
          {ACCESS_STEPS.map((step) => (
            <div
              key={step.code}
              className="grid grid-cols-[24px_1fr] gap-2 items-start text-xs py-1.5 border-b border-[#6ea8ff]/10 last:border-0"
            >
              <span className="text-[#6ea8ff]/60 text-[10px] pt-0.5">{step.code}</span>
              <div>
                <span className="text-[#e8eefb] font-medium">{step.label}: </span>
                <span className="text-[#e8eefb]/65 text-[11px]">{step.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Primary Sign-In Action */}
        <button
          onClick={handleSignIn}
          disabled={isSigningIn}
          className="w-full py-3 px-4 rounded bg-[#e8eefb] text-[#05070d] font-bold text-xs tracking-wider uppercase hover:bg-[#6ea8ff] hover:text-[#05070d] hover:shadow-[0_0_25px_rgba(110,168,255,0.4)] transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed group"
        >
          <GoogleIcon className="w-4 h-4" />
          <span>{isSigningIn ? "REDIRECTING TO GOOGLE..." : "CONTINUE WITH GOOGLE"}</span>
          <span className="text-[#05070d] group-hover:translate-x-0.5 transition-transform">→</span>
        </button>

        <div className="p-2.5 rounded bg-[#060b14] border border-[#6ea8ff]/15 text-[10px] text-[#e8eefb]/60 leading-relaxed flex items-start gap-2">
          <ShieldLockIcon className="w-3.5 h-3.5 text-[#6ea8ff] shrink-0 mt-0.5" />
          <span>
            <b className="text-[#e8eefb]">Sign-in is not unlock.</b> Google sign-in
            identifies you; it does not unlock the vault. After sign-in, your Vault
            Passphrase unlocks the encryption keys locally in the browser.
          </span>
        </div>
      </div>
    </div>
  );
}
