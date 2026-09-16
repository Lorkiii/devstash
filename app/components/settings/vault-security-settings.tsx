"use client";

import React, { useEffect, useRef, useState } from "react";
import { KeyRound, LoaderCircle, RotateCcw, ShieldCheck } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { useVaultSession } from "@/app/lib/vault-session";
import {
  persistPassphraseReplacement,
  persistRecoveryReplacement,
} from "@/app/lib/vault-profile-client";
import {
  changePassphraseInWorker,
  rotateRecoveryPhraseInWorker,
} from "@/app/lib/vault-crypto/worker-client";
import { normalizeRecoveryPhrase } from "@/app/lib/vault-crypto/recovery-phrase";
import type { VaultRecoveryRotationDraft } from "@/app/lib/vault-profile.types";

const FIELD_CLASS = "min-h-11 w-full rounded-lg border border-border bg-background/80 px-3 py-2.5 font-mono text-sm text-foreground outline-none placeholder:text-subtle-foreground focus:border-accent focus:ring-2 focus:ring-accent/15";
const ACTION_CLASS = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-amber-500/45 bg-amber-500/10 px-4 py-2 font-mono text-xs font-semibold tracking-wider text-amber-700 transition-colors hover:bg-amber-500/18 disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-200";

export function VaultSecuritySettings() {
  const session = useVaultSession();
  const [changeOpen, setChangeOpen] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [currentPassphrase, setCurrentPassphrase] = useState("");
  const [newPassphrase, setNewPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [rotationDraft, setRotationDraft] = useState<VaultRecoveryRotationDraft | null>(null);
  const [phraseConfirmation, setPhraseConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [changeFeedback, setChangeFeedback] = useState<string | null>(null);
  const [rotationFeedback, setRotationFeedback] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const clearPassphrases = () => {
    setCurrentPassphrase("");
    setNewPassphrase("");
    setConfirmation("");
  };

  const handleChangePassphrase = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session.profile || newPassphrase !== confirmation) {
      setChangeFeedback("New passphrase confirmation does not match.");
      return;
    }
    const previousProfile = session.profile;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsWorking(true);
    setChangeFeedback(null);
    try {
      const draft = await changePassphraseInWorker(
        session.ownerId,
        previousProfile,
        currentPassphrase,
        newPassphrase,
        { signal: controller.signal },
      );
      clearPassphrases();
      try {
        const persisted = await persistPassphraseReplacement(previousProfile, draft.profile);
        session.replaceUnlockedProfile({ profile: persisted, dek: draft.dek });
        setChangeOpen(false);
        setChangeFeedback("Passphrase changed. Existing records keep the same vault key.");
      } catch {
        session.lock();
        await session.reloadProfile();
        setChangeFeedback("The update could not be confirmed. The vault was locked; unlock and try again.");
      }
    } catch {
      clearPassphrases();
      setChangeFeedback("Current passphrase could not be verified. The vault was not changed.");
    } finally {
      abortRef.current = null;
      setIsWorking(false);
    }
  };

  const handlePrepareRotation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session.profile) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsWorking(true);
    setRotationFeedback(null);
    try {
      const draft = await rotateRecoveryPhraseInWorker(
        session.ownerId,
        session.profile,
        currentPassphrase,
        { signal: controller.signal },
      );
      setCurrentPassphrase("");
      setRotationDraft(draft);
    } catch {
      setCurrentPassphrase("");
      setRotationFeedback("Current passphrase could not be verified. The Recovery Phrase was not changed.");
    } finally {
      abortRef.current = null;
      setIsWorking(false);
    }
  };

  const handlePersistRotation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session.profile || !rotationDraft) return;
    let phraseMatches = false;
    try {
      phraseMatches = normalizeRecoveryPhrase(phraseConfirmation) === rotationDraft.recoveryPhrase;
    } catch {
      phraseMatches = false;
    }
    if (!phraseMatches || !acknowledged) {
      setRotationFeedback("Re-enter the complete saved phrase and acknowledge the rotation warning.");
      return;
    }

    const previousProfile = session.profile;
    setIsWorking(true);
    setRotationFeedback(null);
    try {
      const persisted = await persistRecoveryReplacement(previousProfile, rotationDraft.profile);
      session.replaceUnlockedProfile({ profile: persisted, dek: rotationDraft.dek });
      setRotationDraft(null);
      setPhraseConfirmation("");
      setAcknowledged(false);
      setRotateOpen(false);
      setRotationFeedback("Recovery Phrase rotated. Keep the new phrase private and offline.");
    } catch {
      setRotationDraft(null);
      setPhraseConfirmation("");
      setAcknowledged(false);
      session.lock();
      await session.reloadProfile();
      setRotationFeedback("The rotation could not be confirmed. The vault was locked; the displayed phrase is not active.");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <>
      <ConsolePanel title="VAULT PASSPHRASE" status="LOCAL KEY WRAP" tone="amber">
        <p className="mb-4 text-sm leading-6 text-muted-foreground">
          Re-verify the current passphrase, derive a new key, and rewrap the same vault key. Records are not re-encrypted.
        </p>
        {changeOpen ? (
          <form onSubmit={handleChangePassphrase} className="space-y-3">
            <SecretField label="Current Vault Passphrase" value={currentPassphrase} onChange={setCurrentPassphrase} autoComplete="current-password" />
            <SecretField label="New Vault Passphrase" value={newPassphrase} onChange={setNewPassphrase} autoComplete="new-password" />
            <SecretField label="Confirm New Vault Passphrase" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={isWorking} className={ACTION_CLASS}>
                {isWorking ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                SAVE NEW PASSPHRASE
              </button>
              <button type="button" disabled={isWorking} onClick={() => { clearPassphrases(); setChangeOpen(false); }} className="min-h-11 px-3 py-2 font-mono text-xs text-muted-foreground hover:text-foreground">CANCEL</button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            disabled={isWorking}
            onClick={() => {
              setRotationDraft(null);
              setPhraseConfirmation("");
              setAcknowledged(false);
              setRotateOpen(false);
              setRotationFeedback(null);
              setChangeOpen(true);
            }}
            className={ACTION_CLASS}
          >
            <KeyRound className="h-3.5 w-3.5" /> CHANGE PASSPHRASE
          </button>
        )}
        {changeFeedback && <p role="status" className="mt-3 text-sm leading-6 text-muted-foreground">{changeFeedback}</p>}
      </ConsolePanel>

      <ConsolePanel title="RECOVERY PHRASE" status="SHOW ONCE" tone="amber">
        <p className="mb-4 text-sm leading-6 text-muted-foreground">
          Rotation replaces only the current recovery wrapper. An older backup can still match its older phrase.
        </p>
        {!rotateOpen ? (
          <button
            type="button"
            disabled={isWorking}
            onClick={() => {
              clearPassphrases();
              setChangeOpen(false);
              setChangeFeedback(null);
              setRotateOpen(true);
            }}
            className={ACTION_CLASS}
          >
            <RotateCcw className="h-3.5 w-3.5" /> ROTATE RECOVERY PHRASE
          </button>
        ) : !rotationDraft ? (
          <form onSubmit={handlePrepareRotation} className="space-y-3">
            <SecretField label="Current Vault Passphrase" value={currentPassphrase} onChange={setCurrentPassphrase} autoComplete="current-password" />
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={isWorking} className={ACTION_CLASS}>
                {isWorking ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                GENERATE NEW PHRASE
              </button>
              <button type="button" disabled={isWorking} onClick={() => { clearPassphrases(); setRotateOpen(false); }} className="min-h-11 px-3 py-2 font-mono text-xs text-muted-foreground hover:text-foreground">CANCEL</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePersistRotation} className="space-y-3">
            <p className="select-text rounded-lg border border-amber-500/35 bg-amber-500/8 p-3 font-mono text-xs leading-6 text-amber-800 dark:text-amber-100">
              {rotationDraft.recoveryPhrase}
            </p>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] tracking-widest text-muted-foreground">RE-ENTER THE COMPLETE SAVED PHRASE</span>
              <textarea value={phraseConfirmation} onChange={(event) => setPhraseConfirmation(event.target.value)} rows={4} autoComplete="off" autoCapitalize="none" spellCheck={false} required className={FIELD_CLASS} />
            </label>
            <label className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
              <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 accent-accent" />
              <span>I saved the new phrase and understand the old phrase may still unlock an older backup.</span>
            </label>
            <button type="submit" disabled={isWorking} className={ACTION_CLASS}>
              {isWorking ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              ACTIVATE NEW PHRASE
            </button>
          </form>
        )}
        {rotationFeedback && <p role="status" className="mt-3 text-sm leading-6 text-muted-foreground">{rotationFeedback}</p>}
      </ConsolePanel>
    </>
  );
}

function SecretField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-subtle-foreground">{label.toUpperCase()}</span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        minLength={15}
        maxLength={256}
        required
        className={FIELD_CLASS}
      />
    </label>
  );
}
