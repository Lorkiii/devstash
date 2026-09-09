import { ShieldLockIcon } from "@/app/components/ui/icons";

// Identity is live; no passphrase is accepted until the crypto phase is verified.
export function VaultLockPanel() {
  return (
    <section aria-labelledby="vault-lock-title" className="w-full max-w-md rounded-lg border border-[#6ea8ff]/30 bg-[#0a1220]/85 p-5 font-mono text-[#e8eefb] shadow-xl">
      <div className="mb-4 flex items-center gap-2 border-b border-[#6ea8ff]/20 pb-3 text-xs tracking-widest text-amber-300">
        <ShieldLockIcon className="h-4 w-4" /> SIGNED IN · LOCKED
      </div>
      <h2 id="vault-lock-title" className="mb-3 text-lg font-semibold">Your vault is locked</h2>
      <p className="text-sm leading-relaxed text-[#e8eefb]/75">
        Google has verified your identity. Vault setup and passphrase unlock are
        not available yet; they will be enabled after client-side encryption is implemented and verified.
      </p>
      <p className="mt-3 text-xs leading-relaxed text-[#e8eefb]/55">
        No vault data is loaded. Google sign-in does not unlock your vault.
      </p>
    </section>
  );
}
