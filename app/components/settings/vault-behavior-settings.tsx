"use client";

import { ConsolePanel } from "@/app/components/ui/console-panel";
import { useVaultSession } from "@/app/lib/vault-session";
import { AUTO_LOCK_OPTIONS_MINUTES } from "@/app/lib/vault-session.types";

export function VaultBehaviorSettings() {
  const { autoLockMinutes, setAutoLockMinutes } = useVaultSession();

  return (
    <ConsolePanel title="AUTO-LOCK" status={`${autoLockMinutes} MINUTES`}>
      <p className="mb-4 max-w-3xl text-sm leading-6 text-muted-foreground">
        Choose how long this tab can stay inactive before DevStash discards the in-memory key and decrypted records.
      </p>
      <div role="radiogroup" aria-label="Auto-lock after" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {AUTO_LOCK_OPTIONS_MINUTES.map((minutes) => {
          const active = minutes === autoLockMinutes;
          return (
            <button
              key={minutes}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setAutoLockMinutes(minutes)}
              className={`min-h-11 rounded-lg border px-4 py-2 font-mono text-xs font-semibold tracking-wider transition-colors cursor-pointer ${
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
      <p className="mt-3 text-xs leading-5 text-subtle-foreground">
        This preference applies immediately in the current tab and returns to 15 minutes after a refresh.
      </p>
    </ConsolePanel>
  );
}
