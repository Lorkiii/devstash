"use client";

import { useState } from "react";
import { Download, LoaderCircle, LockKeyhole } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { useVaultSession } from "@/app/lib/vault-session";
import { downloadEncryptedVaultBackup } from "@/app/lib/vault-backup-client";

export function BackupSettings() {
  const { exportEncryptedBackup, lock } = useVaultSession();
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setFeedback(null);
    try {
      const backup = await exportEncryptedBackup();
      downloadEncryptedVaultBackup(backup);
      setFeedback("Encrypted backup created and downloaded. Keep it private.");
    } catch {
      setFeedback("Encrypted backup could not be created. No file was downloaded.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ConsolePanel title="ENCRYPTED BACKUP" status="CIPHERTEXT ONLY">
      <p className="max-w-3xl text-xs leading-[1.125rem] text-muted-foreground sm:text-sm sm:leading-6">
        Export ciphertext, the encryption profile, and an integrity-protected manifest. Your passphrase is still required to restore it.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={isExporting}
          onClick={() => void handleExport()}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-accent/45 bg-accent/10 px-3 py-2 font-mono text-[11px] font-semibold tracking-wider text-foreground transition-colors hover:bg-accent/18 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:px-4 sm:text-xs"
        >
          {isExporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          EXPORT ENCRYPTED BACKUP
        </button>
        <button
          type="button"
          disabled={isExporting}
          onClick={lock}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-amber-500/45 bg-amber-500/10 px-3 py-2 font-mono text-[11px] font-semibold tracking-wider text-amber-700 transition-colors hover:bg-amber-500/18 disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-200 sm:min-h-11 sm:px-4 sm:text-xs"
        >
          <LockKeyhole className="h-4 w-4" /> LOCK TO RESTORE
        </button>
      </div>
      <p className="mt-2.5 text-[11px] leading-4 text-subtle-foreground sm:mt-3 sm:text-xs sm:leading-5">
        Restore is available from the locked screen. DevStash verifies the complete backup locally before replacing ciphertext.
      </p>
      {feedback && <p role="status" className="mt-2.5 text-xs leading-[1.125rem] text-muted-foreground sm:mt-3 sm:text-sm sm:leading-6">{feedback}</p>}
    </ConsolePanel>
  );
}
