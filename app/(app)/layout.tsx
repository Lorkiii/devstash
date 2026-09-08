import type { Metadata } from "next";
import { AppShell } from "@/app/components/shell/app-shell";

// Private pages must never be indexed or cached by crawlers.
export const metadata: Metadata = {
  title: "DevStash — Vault",
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
