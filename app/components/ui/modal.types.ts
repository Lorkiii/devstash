import type { ReactNode } from "react";

export type ModalMaxWidth = "md" | "lg" | "2xl" | "3xl";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  status?: string;
  description?: string;
  icon?: ReactNode;
  footer?: ReactNode;
  maxWidth?: ModalMaxWidth;
  closeDisabled?: boolean;
  children: ReactNode;
}
