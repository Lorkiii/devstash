"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { StarfieldCanvas } from "@/app/components/ui/starfield-canvas";
import { OrbitalHorizon } from "./components/landing/background/orbital-horizon";
import { LandingHeader } from "./components/landing/sections/landing-header";
import { LandingHeroPanel } from "./components/landing/sections/landing-hero-panel";
import { LandingFooter } from "./components/landing/sections/landing-footer";
import { SecurityModal } from "./components/landing/modals/security-modal";
import { EnvelopeModal } from "./components/landing/modals/envelope-modal";
import { AuthTerminalPanel } from "./components/auth/auth-terminal-panel";
import { AUTH_ROUTES } from "./lib/auth/config";

export default function LandingPage() {
  const router = useRouter();
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);
  const [isEnvelopeModalOpen, setIsEnvelopeModalOpen] = useState<boolean>(false);

  const openSecurityModal = () => setIsSecurityModalOpen(true);
  const openEnvelopeModal = () => setIsEnvelopeModalOpen(true);

  const handleGoogleSignIn = () => {
    router.push(AUTH_ROUTES.login);
  };

  return (
    // Desktop is pinned to one viewport; smaller screens stack and scroll normally.
    <div className="relative min-h-dvh lg:h-dvh lg:overflow-hidden flex flex-col bg-[#05070d] text-[#e8eefb] overflow-x-hidden selection:bg-[#6ea8ff]/30 selection:text-white">
      <StarfieldCanvas starCount={200} motion="orbit" />
      <OrbitalHorizon />

      <LandingHeader
        onOpenSecurityModal={openSecurityModal}
        onOpenEnvelopeModal={openEnvelopeModal}
        onSignInClick={handleGoogleSignIn}
      />

      <main className="relative z-10 flex-1 min-h-0 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7">
            <LandingHeroPanel onOpenSecurityModal={openSecurityModal} />
          </div>

          <div className="lg:col-span-5">
            <AuthTerminalPanel />
          </div>
        </div>
      </main>

      <LandingFooter onOpenSecurityModal={openSecurityModal} />

      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />

      <EnvelopeModal
        isOpen={isEnvelopeModalOpen}
        onClose={() => setIsEnvelopeModalOpen(false)}
      />
    </div>
  );
}
