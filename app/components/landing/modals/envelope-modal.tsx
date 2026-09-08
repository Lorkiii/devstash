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
      footerLabel="NO SERVER-SIDE PASSPHRASE RECOVERY IN V1"
      footerAction="CLOSE"
      maxWidth="3xl"
    >
      <div className="mt-5">
        <EnvelopeDiagram />
      </div>
    </Modal>
  );
}
