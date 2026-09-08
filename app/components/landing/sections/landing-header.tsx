"use client";

import React from "react";
import type { LandingHeaderProps } from "./landing-header.types";

export function LandingHeader({
  onOpenSecurityModal,
  onOpenEnvelopeModal,
  onSignInClick,
}: LandingHeaderProps) {
  return (
    <header className="w-full relative z-20 border-b border-[#6ea8ff]/15 bg-[#05070d]/70 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold tracking-[0.08em] text-lg sm:text-xl text-[#e8eefb]">
            <span>DEVSTASH</span>
            <span className="text-[#6ea8ff] font-extrabold">↑</span>
          </div>
          <span className="hidden sm:inline-block text-[10px] font-mono tracking-widest text-[#6ea8ff] px-2 py-0.5 rounded bg-[#6ea8ff]/10 border border-[#6ea8ff]/25">
            VAULT · V1
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 font-mono text-xs tracking-wider text-[#e8eefb]/70">
          <button
            onClick={onOpenEnvelopeModal}
            className="hover:text-[#6ea8ff] transition-colors cursor-pointer"
          >
            ARCHITECTURE
          </button>
          <button
            onClick={onOpenSecurityModal}
            className="hover:text-[#6ea8ff] transition-colors cursor-pointer"
          >
            SECURITY
          </button>
        </nav>

        <button
          onClick={onSignInClick}
          className="px-3.5 py-1.5 rounded border border-[#6ea8ff] text-[#6ea8ff] hover:bg-[#6ea8ff] hover:text-[#05070d] font-mono text-xs font-semibold tracking-wider transition-all duration-200 shadow-[0_0_15px_rgba(110,168,255,0.2)] cursor-pointer"
        >
          SIGN IN
        </button>
      </div>
    </header>
  );
}
