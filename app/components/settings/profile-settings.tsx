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
        <p role="status" className="text-sm text-muted-foreground">Loading your account profile…</p>
      </ConsolePanel>
    );
  }

  if (!account.profile) {
    return (
      <ConsolePanel title="ACCOUNT PROFILE" status="UNAVAILABLE">
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="text-sm text-rose-700 dark:text-rose-200">
            {account.error ?? "Account profile is unavailable."}
          </p>
          <button
            type="button"
            onClick={account.reload}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-accent/40 px-3 text-sm font-semibold text-accent-strong hover:bg-accent/10"
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-8">
        <div className="flex min-w-0 items-start gap-4 rounded-xl border border-accent/20 bg-accent/5 p-4">
          <AccountAvatar displayName={profile.displayName} size="large" />
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-foreground">
              {profile.displayName ?? "Your profile"}
            </p>
            <p className="mt-1 break-all text-sm text-muted-foreground">{profile.email}</p>
            <p className="mt-2 font-mono text-[10px] tracking-wider text-accent-strong">VERIFIED GMAIL IDENTITY</p>
          </div>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="min-w-0 space-y-3">
          <div>
            <label htmlFor="account-display-name" className="block text-sm font-semibold text-foreground">
              Username (display name)
            </label>
            <p id="account-display-name-help" className="mt-1 text-xs leading-5 text-muted-foreground">
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
            className="min-h-11 w-full rounded-lg border border-border bg-surface-inset px-3 text-sm text-foreground outline-none placeholder:text-subtle-foreground focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-60"
          />
          <p id="account-display-name-validation" aria-live="polite" className={`min-h-5 text-xs ${invalid ? "text-rose-700 dark:text-rose-200" : "text-subtle-foreground"}`}>
            {invalid ? "Use one line of up to 40 characters; control characters are not allowed." : "Leave blank and save to remove the display name."}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!hasChanges || isSaving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-accent/55 bg-accent/15 px-4 text-sm font-semibold text-accent-strong transition-colors hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {isSaving ? "Saving…" : "Save display name"}
            </button>
            {message && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-200">{message}</p>}
            {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-200">{error}</p>}
          </div>
        </form>
      </div>
    </ConsolePanel>
  );
}
