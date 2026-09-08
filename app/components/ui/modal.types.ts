import type { ReactNode } from "react";

export type ModalMaxWidth = "2xl" | "3xl";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  footerLabel: string;
  footerAction: string;
  maxWidth?: ModalMaxWidth;
  children: ReactNode;
}
