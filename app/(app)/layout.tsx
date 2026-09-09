import type { Metadata } from "next";
import { AppShell } from "@/app/components/shell/app-shell";
import { requireSession } from "@/app/lib/auth/session";

export const dynamic = "force-dynamic";

// Private pages must never be indexed or cached by crawlers.
export const metadata: Metadata = {
  title: "DevStash — Vault",
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return <AppShell session={session}>{children}</AppShell>;
}
