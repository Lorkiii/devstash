import { requireSession } from "@/app/lib/auth/session";
import { VaultBrowser } from "@/app/components/vault/vault-browser";

export default async function VaultPage() {
  await requireSession();
  return <VaultBrowser />;
}
