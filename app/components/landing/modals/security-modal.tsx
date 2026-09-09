"use client";

import React from "react";
import { Modal } from "@/app/components/ui/modal";
import type { SecurityModalProps } from "./security-modal.types";

const INVARIANTS = [
  {
    num: "01",
    title: "Strict Auth & Key Separation",
    desc: "Google OAuth verifies developer identity; the Vault Passphrase independently derives encryption keys. Google sign-in never unlocks the vault.",
  },
  {
    num: "02",
    title: "No Server-Side Plaintext",
    desc: "Plaintext secrets, notes, .env configs, and tasks exist only in transient browser RAM. Servers and databases hold only encrypted ciphertexts.",
  },
  {
    num: "03",
    title: "Argon2id + AES-256-GCM Envelope",
    desc: "Passphrase derives a KEK via Argon2id. The KEK unwraps the DEK. Every record uses a fresh 96-bit random nonce and a 128-bit authentication tag.",
  },
  {
    num: "04",
    title: "Authenticated Additional Data (AAD)",
    desc: "Payloads are cryptographically bound to encryption version, owner identity, record ID, and entity type, preventing record swapping and tampering.",
  },
  {
    num: "05",
    title: "No Plaintext Search Mirrors",
    desc: "Search executes purely in browser memory after local decryption. No plaintext database columns, no blind indexes, no server-side decryption.",
  },
  {
    num: "06",
    title: "Auto-Lock & Ephemeral Memory",
    desc: "Vault locks on 15m inactivity, browser refresh, session loss, or explicit user action, immediately clearing all key references from memory.",
  },
];

export function SecurityModal({ isOpen, onClose }: SecurityModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="DEVSTASH SECURITY INVARIANTS · V1"
      footerLabel="SPEC: CLIENT-SIDE ENVELOPE ENCRYPTION"
      footerAction="ACKNOWLEDGE"
      maxWidth="2xl"
    >
      {/* Threat Model Callout */}
      <div className="mt-4 p-3.5 rounded bg-[#060b14] border border-[#6ea8ff]/20 text-xs text-[#e8eefb]/75 leading-relaxed font-sans">
        <b className="text-[#6ea8ff] font-mono uppercase block mb-1">
          THREAT MODEL SUMMARY:
        </b>
        DevStash reduces risk from database/snapshot leaks, forged identities, cross-user
        access, accidental server-side plaintext handling, ciphertext tampering, and network
        observation under HTTPS. It does not protect against a compromised device or browser,
        XSS while unlocked, or a weak passphrase.
      </div>

      {/* Invariants Grid */}
      <div className="mt-5 space-y-3 font-sans">
        {INVARIANTS.map((inv) => (
          <div
            key={inv.num}
            className="p-3 rounded bg-[#070e1b] border border-[#6ea8ff]/15 flex items-start gap-3 hover:border-[#6ea8ff]/35 transition-colors"
          >
            <span className="font-mono text-xs font-bold text-[#6ea8ff] px-1.5 py-0.5 rounded bg-[#6ea8ff]/10 border border-[#6ea8ff]/20 shrink-0">
              {inv.num}
            </span>
            <div>
              <h4 className="text-xs font-mono font-bold text-[#e8eefb] mb-1">
                {inv.title}
              </h4>
              <p className="text-xs text-[#e8eefb]/70 leading-relaxed">
                {inv.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
