import { Suspense } from "react";
import { VaultBrowser } from "@/app/components/vault/vault-browser";

// useSearchParams inside VaultBrowser requires a Suspense boundary.
export default function VaultPage() {
  return (
    <Suspense fallback={null}>
      <VaultBrowser />
    </Suspense>
  );
}
