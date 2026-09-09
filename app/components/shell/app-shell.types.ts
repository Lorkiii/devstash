import type { ReactNode } from "react";
import type { Session } from "next-auth";

export interface AppShellProps {
  children: ReactNode;
  session: Session;
}

export interface ShellFrameProps {
  children: ReactNode;
}
