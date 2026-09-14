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
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#05070d] text-[#e8eefb] selection:bg-[#6ea8ff]/30 selection:text-white">
      <StarfieldCanvas starCount={520} motion="orbit" />
      <OrbitalHorizon />

      <LandingHeader
        onOpenSecurityModal={openSecurityModal}
        onOpenEnvelopeModal={openEnvelopeModal}
        onSignInClick={handleGoogleSignIn}
      />

      <main className="relative z-10 flex min-h-0 w-full flex-1 items-center px-4 py-4 sm:px-5 lg:px-6">
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
