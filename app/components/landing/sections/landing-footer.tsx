"use client";

import React from "react";

export function LandingFooter() {
  return (
    <footer className="relative z-10 border-t border-accent/15 bg-background/82 px-4 py-3 font-mono text-[10px] text-subtle-foreground backdrop-blur-md sm:px-5 lg:px-6">
      <div className="flex w-full flex-col items-center justify-between gap-2.5 text-center sm:flex-row sm:flex-wrap sm:text-left">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.65)]" />
          <span className="tracking-[0.1em]">DEVSTASH · ENCRYPTED BEFORE SYNC</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 tracking-[0.08em] text-subtle-foreground sm:justify-end">
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
