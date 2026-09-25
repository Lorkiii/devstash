import type { ReactNode, RefObject } from "react";

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
  bodyClassName?: string;
  closeDisabled?: boolean;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}
