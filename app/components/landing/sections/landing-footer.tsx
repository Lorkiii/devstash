"use client";

import React from "react";
import type { LandingFooterProps } from "./landing-footer.types";

export function LandingFooter({ onOpenSecurityModal }: LandingFooterProps) {
  return (
    <footer className="relative z-10 border-t border-[#6ea8ff]/15 bg-[#05070d]/80 backdrop-blur-sm py-2.5 px-4 sm:px-8 font-mono text-[11px] text-[#e8eefb]/50">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
          <span>DEVSTASH · CLIENT-SIDE ENCRYPTED BY DESIGN</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-[#e8eefb]/40">
          <span>ARGON2ID</span>
          <span>·</span>
          <span>AES-256-GCM</span>
          <span>·</span>
          <span>GOOGLE SIGN-IN ONLY</span>
          <span>·</span>
          <button
            onClick={onOpenSecurityModal}
            className="text-[#6ea8ff] hover:underline cursor-pointer"
          >
            SECURITY
          </button>
        </div>
      </div>
    </footer>
  );
}
