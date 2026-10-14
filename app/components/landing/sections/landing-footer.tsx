"use client";

import React from "react";

export function LandingFooter() {
  return (
    <footer className="relative z-10 border-t border-border/40 px-4 py-5 text-[10px] text-subtle-foreground sm:px-5 sm:text-[11px] lg:px-6">
      <div className="flex w-full flex-col items-center justify-between gap-2.5 text-center sm:flex-row sm:flex-wrap sm:text-left">
        <div className="flex items-center gap-2">
          <span className="tracking-[0.06em]">DEVSTASH · ENCRYPTED BEFORE SYNC</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-mono tracking-[0.02em] text-subtle-foreground sm:justify-end">
          <span>ARGON2ID KEY DERIVATION</span>
          <span aria-hidden="true" className="text-accent">/</span>
          <span>AES-256-GCM ENCRYPTION</span>
          <span aria-hidden="true" className="text-accent">/</span>
          <span>LOCAL DECRYPTION</span>
        </div>
      </div>
    </footer>
  );
}
