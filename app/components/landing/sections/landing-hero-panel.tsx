"use client";

import React from "react";
import { FeaturePillars } from "./feature-pillars";
import { ArrowUpRightIcon } from "@/app/components/ui/icons";
import type { LandingHeroPanelProps } from "./landing-hero-panel.types";

export function LandingHeroPanel({ onOpenSecurityModal }: LandingHeroPanelProps) {
  return (
    <div className="flex flex-col space-y-4 lg:space-y-5">
      <div className="space-y-2.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#6ea8ff]/10 border border-[#6ea8ff]/25 text-[#6ea8ff] font-mono text-[11px] tracking-[0.2em] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6ea8ff] animate-pulse" />
          <span>DEVSTASH · CLIENT-SIDE ENCRYPTED · V1</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#e8eefb] leading-[1.06]">
          Client-encrypted<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6ea8ff] via-[#8ab9ff] to-[#dbe7ff]">
            by design.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-[#e8eefb]/75 max-w-lg leading-relaxed font-sans">
          A personal, vault-first developer workspace for encrypted secrets, .env
          configurations, private notes, and project tasks. Decrypted only in
          browser memory; plaintext never reaches the server or database.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onOpenSecurityModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded border border-[#6ea8ff]/30 bg-[#0a1220]/70 text-[#e8eefb] font-semibold text-xs font-mono tracking-wider hover:border-[#6ea8ff]/70 hover:bg-[#0d1b32] transition-all duration-200 cursor-pointer"
        >
          <span>SECURITY INVARIANTS</span>
          <ArrowUpRightIcon className="w-3.5 h-3.5 text-[#6ea8ff]" />
        </button>
      </div>

      <div>
        <div className="text-[11px] font-mono tracking-wider text-[#e8eefb]/50 mb-2">
          WORKSPACE CAPABILITIES
        </div>
        <FeaturePillars />
      </div>
    </div>
  );
}
