"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Download, KeyRound, LogOut, Upload } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { PageHeading } from "@/app/components/ui/page-heading";
import { useVaultSession } from "@/app/lib/vault-session";
import { AUTO_LOCK_OPTIONS_MINUTES } from "@/app/lib/vault-session.types";

// Synthetic identity for the preview; the real value comes from the verified
// server session in the authentication phase and is never browser-supplied.
const PREVIEW_IDENTITY = "demo.dev@example.test";

export function SettingsPanels() {
  const router = useRouter();
  const { autoLockMinutes, setAutoLockMinutes, lock } = useVaultSession();

  const handleSignOut = () => {
    lock();
    router.push("/");
  };

  return (
    <div className="space-y-4">
      <PageHeading
        eyebrow="SETTINGS"
        title="Settings"
        description="Only non-sensitive preferences live here. Nothing on this page can recover a lost passphrase."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ConsolePanel title="AUTO-LOCK" status="PREFERENCE">
          <p className="text-xs text-[#e8eefb]/65 mb-3">
            Lock the vault after this much inactivity. Locking discards the in-memory key and every decrypted
            record in this tab.
          </p>
          <div role="radiogroup" aria-label="Auto-lock after" className="flex flex-wrap gap-1.5">
            {AUTO_LOCK_OPTIONS_MINUTES.map((minutes) => {
              const active = minutes === autoLockMinutes;
              return (
                <button
                  key={minutes}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setAutoLockMinutes(minutes)}
                  className={`rounded border px-3 py-1.5 font-mono text-xs tracking-wider transition-colors cursor-pointer ${
                    active
                      ? "bg-[#6ea8ff]/15 border-[#6ea8ff]/60 text-[#e8eefb]"
                      : "border-[#6ea8ff]/20 text-[#e8eefb]/60 hover:text-[#e8eefb] hover:border-[#6ea8ff]/50"
                  }`}
                >
                  {minutes} MIN
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[10px] text-[#e8eefb]/35 font-mono">
            Applies to the next unlock. Persisting this preference lands with the API phase.
          </p>
        </ConsolePanel>

        <ConsolePanel title="APPEARANCE" status="FIXED">
          <div className="flex items-center justify-between rounded border border-[#6ea8ff]/15 bg-[#070d18]/60 px-3 py-2.5">
            <div>
              <div className="text-xs text-[#e8eefb]">Theme</div>
              <div className="text-[10px] text-[#e8eefb]/45">Dark console is the only theme in V1.</div>
            </div>
            <span className="font-mono text-[10px] tracking-widest text-[#6ea8ff] px-2 py-0.5 rounded bg-[#6ea8ff]/10 border border-[#6ea8ff]/25">
              DARK
            </span>
          </div>
        </ConsolePanel>

        <ConsolePanel title="VAULT PASSPHRASE" status="LOCAL ONLY" tone="amber">
          <p className="text-xs text-[#e8eefb]/65 mb-3">
            Changing the passphrase derives a new key and rewraps the same data key. Records are not
            re-encrypted. There is no server-side reset.
          </p>
          <button
            type="button"
            disabled
            title="Available after the cryptographic proof phase"
            className="inline-flex items-center gap-2 rounded border border-amber-400/30 px-3 py-2 font-mono text-xs tracking-wider text-amber-200/60 disabled:cursor-not-allowed"
          >
            <KeyRound className="w-3.5 h-3.5" /> CHANGE PASSPHRASE
          </button>
        </ConsolePanel>

        <ConsolePanel title="BACKUP" status="ENCRYPTED ONLY">
          <p className="text-xs text-[#e8eefb]/65 mb-3">
            Export contains ciphertext, the encryption profile, and an integrity-protected manifest. It is a
            backup, not a recovery path: the passphrase is still required to restore.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              title="Available in the safety/productivity phase"
              className="inline-flex items-center gap-2 rounded border border-[#6ea8ff]/25 px-3 py-2 font-mono text-xs tracking-wider text-[#e8eefb]/50 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" /> EXPORT
            </button>
            <button
              type="button"
              disabled
              title="Available in the safety/productivity phase"
              className="inline-flex items-center gap-2 rounded border border-[#6ea8ff]/25 px-3 py-2 font-mono text-xs tracking-wider text-[#e8eefb]/50 disabled:cursor-not-allowed"
            >
              <Upload className="w-3.5 h-3.5" /> IMPORT
            </button>
          </div>
        </ConsolePanel>

        <ConsolePanel title="SESSION" status="GOOGLE · PREVIEW" className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-mono">
              <div className="text-[10px] tracking-widest text-[#e8eefb]/45">SIGNED IN AS</div>
              <div className="text-xs text-[#e8eefb]">{PREVIEW_IDENTITY}</div>
              <div className="mt-1 text-[10px] text-[#e8eefb]/40">
                Sign-out clears vault state first, then ends the session. Navigating away alone is not logout.
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded border border-rose-400/40 bg-rose-400/10 px-3 py-2 font-mono text-xs font-semibold tracking-wider text-rose-200 hover:bg-rose-400/20 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> SIGN OUT
            </button>
          </div>
        </ConsolePanel>
      </div>
    </div>
  );
}
