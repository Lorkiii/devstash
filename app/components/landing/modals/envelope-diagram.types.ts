import type { ReactNode } from "react";

export interface Step {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  detail: string;
  icon: ReactNode;
  clientOnly: boolean;
}
