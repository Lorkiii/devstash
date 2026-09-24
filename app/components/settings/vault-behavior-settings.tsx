"use client";

import { ConsolePanel } from "@/app/components/ui/console-panel";
import { useVaultSession } from "@/app/lib/vault-session";
import { AUTO_LOCK_OPTIONS_MINUTES } from "@/app/lib/vault-session.types";

export function VaultBehaviorSettings() {
  const { autoLockMinutes, setAutoLockMinutes } = useVaultSession();

  return (
    <ConsolePanel title="AUTO-LOCK" status={`${autoLockMinutes} MINUTES`}>
      <p className="mb-2.5 max-w-3xl text-xs leading-[1.125rem] text-muted-foreground sm:mb-4 sm:text-sm sm:leading-6">
        Choose how long this tab can stay inactive before DevStash discards the in-memory key and decrypted records.
      </p>
      <div role="radiogroup" aria-label="Auto-lock after" className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
        {AUTO_LOCK_OPTIONS_MINUTES.map((minutes) => {
          const active = minutes === autoLockMinutes;
          return (
            <button
              key={minutes}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setAutoLockMinutes(minutes)}
              className={`min-h-9 rounded-lg border px-2 py-1.5 font-mono text-[11px] font-semibold tracking-wider transition-colors cursor-pointer sm:min-h-11 sm:px-4 sm:py-2 sm:text-xs ${
                active
                  ? "border-accent bg-accent/15 text-foreground"
                  : "border-border bg-surface-inset/60 text-muted-foreground hover:border-accent/50 hover:text-foreground"
              }`}
            >
              {minutes} MIN
            </button>
          );
        })}
      </div>
      <p className="mt-2.5 text-[11px] leading-4 text-subtle-foreground sm:mt-3 sm:text-xs sm:leading-5">
        This preference applies immediately in the current tab and returns to 15 minutes after a refresh.
      </p>
    </ConsolePanel>
  );
}
