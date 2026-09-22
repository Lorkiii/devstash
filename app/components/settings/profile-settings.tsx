"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, RotateCw } from "lucide-react";
import { AccountAvatar } from "@/app/components/account/account-avatar";
import { useAccountProfile } from "@/app/components/account/account-profile-provider";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { accountProfileUpdateSchema, type AccountProfile } from "@/app/lib/account-profile";

export function ProfileSettings() {
  const account = useAccountProfile();

  if (account.isLoading) {
    return (
      <ConsolePanel title="ACCOUNT PROFILE" status="LOADING">
        <p role="status" className="text-[13px] text-muted-foreground sm:text-sm">Loading your account profile…</p>
      </ConsolePanel>
    );
  }

  if (!account.profile) {
    return (
      <ConsolePanel title="ACCOUNT PROFILE" status="UNAVAILABLE">
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="text-[13px] text-rose-700 dark:text-rose-200 sm:text-sm">
            {account.error ?? "Account profile is unavailable."}
          </p>
          <button
            type="button"
            onClick={account.reload}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-accent/40 px-3 text-sm font-semibold text-accent-strong hover:bg-accent/10 sm:min-h-10"
          >
            <RotateCw className="size-4" aria-hidden="true" /> Retry
          </button>
        </div>
      </ConsolePanel>
    );
  }

  return <ProfileEditor profile={account.profile} saveDisplayName={account.saveDisplayName} />;
}

function ProfileEditor({ profile, saveDisplayName }: {
  profile: AccountProfile;
  saveDisplayName: (displayName: string | null) => Promise<void>;
}) {
  const [draft, setDraft] = useState(profile.displayName ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const parsed = accountProfileUpdateSchema.safeParse({ displayName: draft });
  const hasChanges = parsed.success && parsed.data.displayName !== profile.displayName;
  const invalid = !parsed.success;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving || !parsed.success || !hasChanges) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await saveDisplayName(parsed.data.displayName);
      setDraft(parsed.data.displayName ?? "");
      setMessage("Display name saved.");
    } catch {
      setError("Display name could not be saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ConsolePanel title="ACCOUNT PROFILE" status="GOOGLE ACCOUNT" tone="blue">
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-8">
        <div className="flex min-w-0 items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 p-3 sm:gap-4 sm:p-4">
          <AccountAvatar displayName={profile.displayName} size="large" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground sm:text-base">
              {profile.displayName ?? "Your profile"}
            </p>
            <p className="mt-0.5 break-all text-xs text-muted-foreground sm:mt-1 sm:text-sm">{profile.email}</p>
            <p className="mt-1.5 font-mono text-[9px] tracking-wider text-accent-strong sm:mt-2 sm:text-[10px]">VERIFIED GMAIL IDENTITY</p>
          </div>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="min-w-0 space-y-2.5 sm:space-y-3">
          <div>
            <label htmlFor="account-display-name" className="block text-[13px] font-semibold text-foreground sm:text-sm">
              Username (display name)
            </label>
            <p id="account-display-name-help" className="mt-1 text-[11px] leading-4 text-muted-foreground sm:text-xs sm:leading-5">
              This account label appears beside your avatar on large screens and as initials on smaller screens, even while your vault is locked. It is stored unencrypted and is not your sign-in credential or a unique handle.
            </p>
          </div>
          <input
            id="account-display-name"
            type="text"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setMessage(null);
              setError(null);
            }}
            disabled={isSaving}
            maxLength={160}
            autoComplete="nickname"
            aria-describedby="account-display-name-help account-display-name-validation"
            aria-invalid={invalid}
            placeholder="Choose a display name"
            className="min-h-10 w-full rounded-lg border border-border bg-surface-inset px-2.5 text-[13px] text-foreground outline-none placeholder:text-subtle-foreground focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-60 sm:min-h-11 sm:px-3 sm:text-sm"
          />
          <p id="account-display-name-validation" aria-live="polite" className={`min-h-4 text-[11px] sm:min-h-5 sm:text-xs ${invalid ? "text-rose-700 dark:text-rose-200" : "text-subtle-foreground"}`}>
            {invalid ? "Use one line of up to 40 characters; control characters are not allowed." : "Leave blank and save to remove the display name."}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              type="submit"
              disabled={!hasChanges || isSaving}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-accent/55 bg-accent/15 px-3 text-[13px] font-semibold text-accent-strong transition-colors hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:px-4 sm:text-sm"
            >
              {isSaving && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {isSaving ? "Saving…" : "Save display name"}
            </button>
            {message && <p role="status" className="text-[13px] text-emerald-700 dark:text-emerald-200 sm:text-sm">{message}</p>}
            {error && <p role="alert" className="text-[13px] text-rose-700 dark:text-rose-200 sm:text-sm">{error}</p>}
          </div>
        </form>
      </div>
    </ConsolePanel>
  );
}
