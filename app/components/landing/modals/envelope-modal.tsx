"use client";

import React from "react";
import { Modal } from "@/app/components/ui/modal";
import { EnvelopeDiagram } from "./envelope-diagram";
import type { EnvelopeModalProps } from "./envelope-modal.types";

export function EnvelopeModal({ isOpen, onClose }: EnvelopeModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ENVELOPE ENCRYPTION ARCHITECTURE"
      footer={(
        <>
          <span>NO SERVER-SIDE PASSPHRASE RECOVERY</span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg bg-accent px-4 py-2 font-bold text-accent-foreground transition-colors hover:bg-accent-strong"
          >
            CLOSE
          </button>
        </>
      )}
      maxWidth="3xl"
    >
      <div className="mt-5">
        <EnvelopeDiagram />
      </div>
    </Modal>
  );
}
