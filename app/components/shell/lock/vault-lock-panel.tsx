"use client";

import React, { useState } from "react";
import { ShieldLockIcon } from "@/app/components/ui/icons";

type LockPanelMode = "unlock" | "setup";

interface VaultLockPanelProps {
  onUnlock: () => void;
}

const MIN_PASSPHRASE_LENGTH = 12;
const PREVIEW_DERIVATION_MS = 700;

const UNLOCK_STEPS = [
  { code: "01", label: "FETCH", value: "Wrapped DEK and KDF parameters for this account" },
  { code: "02", label: "DERIVE", value: "Argon2id(passphrase, salt) → KEK, in the browser" },
  { code: "03", label: "UNWRAP", value: "AES-256-GCM unwrap of the DEK; failure gives one generic error" },
];

const SETUP_STEPS = [
  { code: "01", label: "CHOOSE", value: "A long passphrase you can type from memory; there is no reset" },
  { code: "02", label: "GENERATE", value: "Random DEK and salt with Web Crypto; derive KEK locally" },
  { code: "03", label: "PERSIST", value: "Only the wrapped DEK and KDF metadata leave the browser" },
];

// Locked face of the app. In this UI preview the passphrase is read into local
// component state only, never stored or sent anywhere, and is discarded on
// submit. The crypto phase replaces the fake delay with real derivation. The
// input is intentionally uncontrolled by any parent so the value cannot leak
// into the session provider.
export function VaultLockPanel({ onUnlock }: VaultLockPanelProps) {
  const [mode, setMode] = useState<LockPanelMode>("unlock");
  const [passphrase, setPassphrase] = useState<string>("");
  const [confirmation, setConfirmation] = useState<string>("");
  const [isWorking, setIsWorking] = useState<boolean>(false);

  const isSetup = mode === "setup";
  const tooShort = passphrase.length > 0 && passphrase.length < MIN_PASSPHRASE_LENGTH;
  const mismatch = isSetup && confirmation.length > 0 && confirmation !== passphrase;
  const canSubmit =
    passphrase.length >= MIN_PASSPHRASE_LENGTH && (!isSetup || confirmation === passphrase) && !isWorking;

  const resetForm = () => {
    setPassphrase("");
    setConfirmation("");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setIsWorking(true);
    // Preview only: simulate the time a real KDF would take, then unlock.
    window.setTimeout(() => {
      resetForm();
      setIsWorking(false);
      onUnlock();
    }, PREVIEW_DERIVATION_MS);
  };

  const switchMode = (next: LockPanelMode) => {
    setMode(next);
    resetForm();
  };

  const steps = isSetup ? SETUP_STEPS : UNLOCK_STEPS;

  return (
    <div className="w-full max-w-md rounded-lg border border-[#6ea8ff]/30 bg-[#0a1220]/85 backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.6),0_0_30px_rgba(110,168,255,0.12)] p-4 sm:p-5 font-mono text-[#e8eefb] relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#6ea8ff]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between border-b border-[#6ea8ff]/20 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-xs font-bold tracking-widest text-[#6ea8ff]">
            {isSetup ? "VAULT SETUP" : "VAULT LOCKED"}
          </span>
        </div>
        <div className="text-[10px] text-[#e8eefb]/60 tracking-wider">SIGNED IN · LOCKED</div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1 bg-[#070d18]/90 p-3 rounded border border-[#6ea8ff]/15">
          <div className="text-[10px] tracking-widest text-[#e8eefb]/45 pb-1 border-b border-white/5">
            {isSetup ? "WHAT SETUP DOES" : "WHAT UNLOCK DOES"}
          </div>
          {steps.map((step) => (
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

        <form onSubmit={handleSubmit} className="space-y-2.5" autoComplete="off">
          <div className="space-y-1">
            <label htmlFor="vault-passphrase" className="block text-[10px] tracking-widest text-[#e8eefb]/55">
              VAULT PASSPHRASE
            </label>
            <input
              id="vault-passphrase"
              type="password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={isWorking}
              aria-invalid={tooShort || undefined}
              aria-describedby="vault-passphrase-hint"
              className="w-full rounded border border-[#6ea8ff]/25 bg-[#060b14] px-3 py-2 text-sm text-[#e8eefb] tracking-widest placeholder:text-[#e8eefb]/25 focus:outline-none focus:border-[#6ea8ff]/70 focus:shadow-[0_0_0_3px_rgba(110,168,255,0.15)] disabled:opacity-60"
              placeholder="••••••••••••••••"
            />
            <p id="vault-passphrase-hint" className="text-[10px] text-[#e8eefb]/40">
              {tooShort
                ? `At least ${MIN_PASSPHRASE_LENGTH} characters.`
                : "Derived locally. Never sent to the server."}
            </p>
          </div>

          {isSetup && (
            <div className="space-y-1">
              <label htmlFor="vault-passphrase-confirm" className="block text-[10px] tracking-widest text-[#e8eefb]/55">
                CONFIRM PASSPHRASE
              </label>
              <input
                id="vault-passphrase-confirm"
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                disabled={isWorking}
                aria-invalid={mismatch || undefined}
                className="w-full rounded border border-[#6ea8ff]/25 bg-[#060b14] px-3 py-2 text-sm text-[#e8eefb] tracking-widest placeholder:text-[#e8eefb]/25 focus:outline-none focus:border-[#6ea8ff]/70 focus:shadow-[0_0_0_3px_rgba(110,168,255,0.15)] disabled:opacity-60"
                placeholder="••••••••••••••••"
              />
              {mismatch && <p className="text-[10px] text-rose-300/80">Passphrases do not match.</p>}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3 px-4 rounded bg-[#e8eefb] text-[#05070d] font-bold text-xs tracking-wider uppercase hover:bg-[#6ea8ff] hover:shadow-[0_0_25px_rgba(110,168,255,0.4)] transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#e8eefb] disabled:hover:shadow-none"
          >
            <ShieldLockIcon className="w-4 h-4" />
            <span>
              {isWorking ? "DERIVING KEY…" : isSetup ? "CREATE VAULT" : "UNLOCK VAULT"}
            </span>
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-[#e8eefb]/45">
          <button
            type="button"
            onClick={() => switchMode(isSetup ? "unlock" : "setup")}
            className="hover:text-[#6ea8ff] transition-colors cursor-pointer tracking-wider"
          >
            {isSetup ? "← BACK TO UNLOCK" : "PREVIEW FIRST-TIME SETUP →"}
          </button>
          <span className="text-amber-300/70 tracking-wider">PREVIEW · NO KDF YET</span>
        </div>
      </div>
    </div>
  );
}
