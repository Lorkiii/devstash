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
          <span>NO SERVER-SIDE PASSPHRASE RECOVERY IN V1</span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg bg-[#6ea8ff] px-4 py-2 font-bold text-[#05070d] transition-colors hover:bg-[#8ab9ff]"
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
