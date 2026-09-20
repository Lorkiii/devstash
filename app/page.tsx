"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { StarfieldCanvas } from "@/app/components/ui/starfield-canvas";
import { OrbitalHorizon } from "./components/landing/background/orbital-horizon";
import { LandingHeader } from "./components/landing/sections/landing-header";
import { LandingHeroPanel } from "./components/landing/sections/landing-hero-panel";
import { LandingFooter } from "./components/landing/sections/landing-footer";
import { LandingVaultPreview } from "./components/landing/sections/landing-vault-preview";
import { LANDING_PREVIEW_MODULES } from "./components/landing/sections/landing-vault-preview.data";
import { EnvelopeModal } from "./components/landing/modals/envelope-modal";
import { AUTH_ROUTES } from "./lib/auth/config";

export default function LandingPage() {
  const router = useRouter();
  const [isEnvelopeModalOpen, setIsEnvelopeModalOpen] = useState<boolean>(false);

  const openEnvelopeModal = () => setIsEnvelopeModalOpen(true);

  const handleGoogleSignIn = () => {
    router.push(AUTH_ROUTES.login);
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-background text-foreground selection:bg-accent/30 selection:text-foreground">
      <StarfieldCanvas starCount={520} motion="orbit" />
      <OrbitalHorizon />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[34rem] bg-[radial-gradient(circle_at_18%_18%,rgba(110,168,255,0.12),transparent_38%)]" />

      <LandingHeader
        onOpenEnvelopeModal={openEnvelopeModal}
        onSignInClick={handleGoogleSignIn}
      />

      <main className="relative z-10 flex min-h-0 w-full flex-1 items-center px-4 py-8 sm:px-5 sm:py-10 lg:px-6 lg:py-12">
        <div className="grid w-full grid-cols-1 items-center gap-9 lg:grid-cols-12 lg:gap-9 xl:gap-14">
          <div className="lg:col-span-6">
            <LandingHeroPanel
              onOpenEnvelopeModal={openEnvelopeModal}
              onSignInClick={handleGoogleSignIn}
            />
          </div>

          <div className="relative min-w-0 lg:col-span-6">
            <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-accent/5 blur-2xl" />
            <LandingVaultPreview modules={LANDING_PREVIEW_MODULES} />
          </div>
        </div>
      </main>

      <LandingFooter />

      <EnvelopeModal
        isOpen={isEnvelopeModalOpen}
        onClose={() => setIsEnvelopeModalOpen(false)}
      />
    </div>
  );
}
