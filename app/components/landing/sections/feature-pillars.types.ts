import type { ReactNode } from "react";

export interface Capability {
  id: string;
  title: string;
  summary: string;
  icon: ReactNode;
}
