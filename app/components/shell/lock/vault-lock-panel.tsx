"use client";

import React, { useEffect, useRef, useState } from "react";
import { KeyRound, LoaderCircle, RotateCcw, ShieldCheck } from "lucide-react";
import { ShieldLockIcon } from "@/app/components/ui/icons";
import { useVaultSession } from "@/app/lib/vault-session";
import {
  VaultProfileRequestError,
  persistNewVaultProfile,
  persistPassphraseReplacement,
} from "@/app/lib/vault-profile-client";
import {
  recoverVaultInWorker,
  setupVaultInWorker,
  unlockVaultInWorker,
} from "@/app/lib/vault-crypto/worker-client";
import { normalizeRecoveryPhrase } from "@/app/lib/vault-crypto/recovery-phrase";
import type { VaultSetupDraft } from "@/app/lib/vault-profile.types";

type LockPanelMode = "unlock" | "recover";

const GENERIC_UNLOCK_ERROR = "Unable to unlock the vault. Check your passphrase and try again.";
const GENERIC_RECOVERY_ERROR = "Unable to recover the vault with that Recovery Phrase.";
const FIELD_CLASS = "w-full rounded border border-[#6ea8ff]/25 bg-[#05070d]/80 px-3 py-2.5 font-mono text-sm text-[#e8eefb] outline-none placeholder:text-[#e8eefb]/25 focus:border-[#6ea8ff]/70";
const PRIMARY_BUTTON_CLASS = "inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[#6ea8ff]/50 bg-[#6ea8ff]/15 px-4 py-2 font-mono text-xs font-semibold tracking-wider text-[#e8eefb] hover:bg-[#6ea8ff]/25 disabled:cursor-not-allowed disabled:opacity-50";

function operationError(error: unknown, fallback: string): string {
  if (error instanceof DOMException && error.name === "AbortError") return "Operation cancelled.";
  if (error instanceof VaultProfileRequestError) {
    return error.status === 409
      ? "The vault profile changed in another tab. Review the current profile and try again."
      : "The vault profile could not be saved. Your vault remains locked.";
  }
  return fallback;
}

export function VaultLockPanel() {
  const session = useVaultSession();
  const [mode, setMode] = useState<LockPanelMode>("unlock");
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [setupDraft, setSetupDraft] = useState<VaultSetupDraft | null>(null);
  const [savedPhraseConfirmation, setSavedPhraseConfirmation] = useState("");
  const [acknowledgedLossWarning, setAcknowledgedLossWarning] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const resetSensitiveForm = () => {
    setPassphrase("");
    setConfirmation("");
    setRecoveryPhrase("");
    setSavedPhraseConfirmation("");
    setAcknowledgedLossWarning(false);
  };

  const beginOperation = () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsWorking(true);
    setError(null);
    return controller;
  };

  const finishOperation = () => {
    abortRef.current = null;
    setIsWorking(false);
  };

  const handleCreateDraft = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passphrase !== confirmation) {
      setError("Passphrase confirmation does not match.");
      return;
    }
    const controller = beginOperation();
    try {
      const draft = await setupVaultInWorker(session.ownerId, passphrase, {
        signal: controller.signal,
      });
      setPassphrase("");
      setConfirmation("");
      setSetupDraft(draft);
    } catch (failure) {
      setError(operationError(failure, "Vault setup could not be prepared in this browser."));
    } finally {
      finishOperation();
    }
  };

  const handlePersistSetup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!setupDraft) return;
    let phraseMatches = false;
    try {
      phraseMatches = normalizeRecoveryPhrase(savedPhraseConfirmation) === setupDraft.recoveryPhrase;
    } catch {
      phraseMatches = false;
    }
    if (!phraseMatches || !acknowledgedLossWarning) {
      setError("Re-enter the complete saved Recovery Phrase and acknowledge the recovery warning.");
      return;
    }

    setIsWorking(true);
    setError(null);
    try {
      const persisted = await persistNewVaultProfile(setupDraft.profile);
      session.openVaultAfterProfileChange({ profile: persisted, dek: setupDraft.dek });
      setSetupDraft(null);
      resetSensitiveForm();
    } catch (failure) {
      setSetupDraft(null);
      resetSensitiveForm();
      await session.reloadProfile();
      setError(operationError(failure, "Vault setup could not be saved. Your vault remains locked."));
    } finally {
      setIsWorking(false);
    }
  };

  const handleUnlock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session.profile) return;
    const controller = beginOperation();
    try {
      const draft = await unlockVaultInWorker(session.ownerId, session.profile, passphrase, {
        signal: controller.signal,
      });
      setPassphrase("");
      session.openVault(draft);
    } catch (failure) {
      setPassphrase("");
      setError(operationError(failure, GENERIC_UNLOCK_ERROR));
    } finally {
      finishOperation();
    }
  };

  const handleRecovery = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session.profile) return;
    if (passphrase !== confirmation) {
      setError("New passphrase confirmation does not match.");
      return;
    }
    const previousProfile = session.profile;
    const controller = beginOperation();
    let draft: Awaited<ReturnType<typeof recoverVaultInWorker>>;
    try {
      draft = await recoverVaultInWorker(
        session.ownerId,
        previousProfile,
        recoveryPhrase,
        passphrase,
        { signal: controller.signal },
      );
    } catch (failure) {
      resetSensitiveForm();
      setError(operationError(failure, GENERIC_RECOVERY_ERROR));
      finishOperation();
      return;
    }

    resetSensitiveForm();
    try {
      const persisted = await persistPassphraseReplacement(previousProfile, draft.profile);
      session.openVaultAfterProfileChange({ profile: persisted, dek: draft.dek });
    } catch (failure) {
      await session.reloadProfile();
      setError(operationError(failure, GENERIC_RECOVERY_ERROR));
    } finally {
      finishOperation();
    }
  };

  if (session.lockState === "loading") {
    return (
      <PanelFrame status="CHECKING PROFILE">
        <h2 id="vault-lock-title" className="sr-only">Checking vault status</h2>
        <div className="flex items-center gap-3 text-sm text-[#e8eefb]/70" role="status">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Loading vault status…
        </div>
      </PanelFrame>
    );
  }

  if (session.lockState === "load-error") {
    return (
      <PanelFrame status="PROFILE UNAVAILABLE">
        <h2 id="vault-lock-title" className="mb-2 text-lg font-semibold">Vault status could not be loaded</h2>
        <p className="mb-4 text-sm leading-relaxed text-[#e8eefb]/65">
          No key or private data was loaded. Check the connection and try again.
        </p>
        <button type="button" onClick={() => void session.reloadProfile()} className={PRIMARY_BUTTON_CLASS}>
          <RotateCcw className="h-3.5 w-3.5" /> RETRY
        </button>
      </PanelFrame>
    );
  }

  if (session.lockState === "no-profile") {
    return setupDraft ? (
      <RecoveryPhraseConfirmation
        draft={setupDraft}
        confirmation={savedPhraseConfirmation}
        acknowledged={acknowledgedLossWarning}
        isWorking={isWorking}
        error={error}
        onConfirmationChange={setSavedPhraseConfirmation}
        onAcknowledgedChange={setAcknowledgedLossWarning}
        onSubmit={handlePersistSetup}
        onCancel={() => {
          setSetupDraft(null);
          resetSensitiveForm();
          setError(null);
        }}
      />
    ) : (
      <PanelFrame status="FIRST-TIME SETUP">
        <form onSubmit={handleCreateDraft} className="space-y-4">
          <div>
            <h2 id="vault-lock-title" className="text-lg font-semibold">Create your encrypted vault</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#e8eefb]/65">
              Choose a passphrase of 15–128 characters. It stays in this browser and only wraps your vault key.
            </p>
          </div>
          <PassphraseFields
            passphrase={passphrase}
            confirmation={confirmation}
            onPassphraseChange={setPassphrase}
            onConfirmationChange={setConfirmation}
            confirmationLabel="Confirm Vault Passphrase"
          />
          {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
          <button type="submit" disabled={isWorking} className={PRIMARY_BUTTON_CLASS}>
            {isWorking ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
            GENERATE RECOVERY PHRASE
          </button>
        </form>
      </PanelFrame>
    );
  }

  return (
    <PanelFrame status={mode === "unlock" ? "SIGNED IN · LOCKED" : "LOCAL RECOVERY"}>
      <div className="mb-4 flex rounded border border-[#6ea8ff]/15 bg-[#05070d]/50 p-1" role="tablist" aria-label="Vault access method">
        {(["unlock", "recover"] as const).map((candidate) => (
          <button
            key={candidate}
            type="button"
            role="tab"
            id={`vault-access-${candidate}-tab`}
            aria-controls={`vault-access-${candidate}-panel`}
            aria-selected={mode === candidate}
            onClick={() => {
              resetSensitiveForm();
              setError(null);
              setMode(candidate);
            }}
            className={`flex-1 rounded px-3 py-2 font-mono text-[10px] tracking-widest ${mode === candidate ? "bg-[#6ea8ff]/15 text-[#e8eefb]" : "text-[#e8eefb]/45"}`}
          >
            {candidate === "unlock" ? "PASSPHRASE" : "RECOVERY PHRASE"}
          </button>
        ))}
      </div>
      {mode === "unlock" ? (
        <UnlockForm
          passphrase={passphrase}
          isWorking={isWorking}
          error={error}
          onPassphraseChange={setPassphrase}
          onSubmit={handleUnlock}
        />
      ) : (
        <RecoveryForm
          recoveryPhrase={recoveryPhrase}
          passphrase={passphrase}
          confirmation={confirmation}
          isWorking={isWorking}
          error={error}
          onRecoveryPhraseChange={setRecoveryPhrase}
          onPassphraseChange={setPassphrase}
          onConfirmationChange={setConfirmation}
          onSubmit={handleRecovery}
        />
      )}
      <p className="mt-4 border-t border-[#6ea8ff]/15 pt-3 text-[10px] leading-relaxed text-[#e8eefb]/40">
        No passphrase or Recovery Phrase is sent to DevStash. Capability failure keeps the vault locked; there is no weaker fallback.
      </p>
    </PanelFrame>
  );
}

function PanelFrame({ children, status }: { children: React.ReactNode; status: string }) {
  return (
    <section
      aria-labelledby="vault-lock-title"
      className="w-full max-w-xl rounded-lg border border-[#6ea8ff]/30 bg-[#0a1220]/90 p-5 font-mono text-[#e8eefb] shadow-xl sm:p-6"
    >
      <div className="mb-4 flex items-center gap-2 border-b border-[#6ea8ff]/20 pb-3 text-xs tracking-widest text-amber-300">
        <ShieldLockIcon className="h-4 w-4" /> {status}
      </div>
      {children}
    </section>
  );
}

interface PassphraseFieldsProps {
  passphrase: string;
  confirmation: string;
  onPassphraseChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  confirmationLabel: string;
  label?: string;
}

function PassphraseFields({
  passphrase,
  confirmation,
  onPassphraseChange,
  onConfirmationChange,
  confirmationLabel,
  label = "Vault Passphrase",
}: PassphraseFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-[#e8eefb]/55">
          {label.toUpperCase()}
        </span>
        <input
          type="password"
          value={passphrase}
          onChange={(event) => onPassphraseChange(event.target.value)}
          autoComplete="new-password"
          minLength={15}
          maxLength={256}
          required
          className={FIELD_CLASS}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-[#e8eefb]/55">
          {confirmationLabel.toUpperCase()}
        </span>
        <input
          type="password"
          value={confirmation}
          onChange={(event) => onConfirmationChange(event.target.value)}
          autoComplete="new-password"
          minLength={15}
          maxLength={256}
          required
          className={FIELD_CLASS}
        />
      </label>
    </div>
  );
}

interface RecoveryPhraseConfirmationProps {
  draft: VaultSetupDraft;
  confirmation: string;
  acknowledged: boolean;
  isWorking: boolean;
  error: string | null;
  onConfirmationChange: (value: string) => void;
  onAcknowledgedChange: (value: boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

function RecoveryPhraseConfirmation({
  draft,
  confirmation,
  acknowledged,
  isWorking,
  error,
  onConfirmationChange,
  onAcknowledgedChange,
  onSubmit,
  onCancel,
}: RecoveryPhraseConfirmationProps) {
  return (
    <PanelFrame status="SAVE RECOVERY PHRASE">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <h2 id="vault-lock-title" className="text-lg font-semibold">Save your Recovery Phrase</h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-200/80">
            Write these 24 words somewhere private and offline. They are shown only during this setup.
          </p>
        </div>
        <div className="select-text rounded border border-amber-400/35 bg-amber-400/5 p-3 font-mono text-xs leading-6 text-amber-100">
          {draft.recoveryPhrase}
        </div>
        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-[#e8eefb]/55">
            RE-ENTER THE COMPLETE SAVED PHRASE
          </span>
          <textarea
            value={confirmation}
            onChange={(event) => onConfirmationChange(event.target.value)}
            rows={4}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            required
            className={FIELD_CLASS}
          />
        </label>
        <label className="flex items-start gap-2 text-xs leading-relaxed text-[#e8eefb]/65">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => onAcknowledgedChange(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            I understand DevStash cannot show or recover this phrase later. Losing both credentials permanently prevents vault recovery.
          </span>
        </label>
        {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={isWorking} className={PRIMARY_BUTTON_CLASS}>
            {isWorking ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            CREATE VAULT
          </button>
          <button
            type="button"
            disabled={isWorking}
            onClick={onCancel}
            className="min-h-10 rounded border border-[#6ea8ff]/20 px-4 py-2 font-mono text-xs text-[#e8eefb]/60 disabled:opacity-50"
          >
            CANCEL
          </button>
        </div>
      </form>
    </PanelFrame>
  );
}

interface UnlockFormProps {
  passphrase: string;
  isWorking: boolean;
  error: string | null;
  onPassphraseChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

function UnlockForm({
  passphrase,
  isWorking,
  error,
  onPassphraseChange,
  onSubmit,
}: UnlockFormProps) {
  return (
    <form
      id="vault-access-unlock-panel"
      aria-labelledby="vault-access-unlock-tab"
      onSubmit={onSubmit}
      className="space-y-4"
      role="tabpanel"
    >
      <div>
        <h2 id="vault-lock-title" className="text-lg font-semibold">Unlock your vault</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#e8eefb]/65">
          Google verified your identity. Your passphrase separately unwraps the vault key in this browser.
        </p>
      </div>
      <label className="block">
        <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-[#e8eefb]/55">VAULT PASSPHRASE</span>
        <input
          type="password"
          value={passphrase}
          onChange={(event) => onPassphraseChange(event.target.value)}
          autoComplete="current-password"
          required
          className={FIELD_CLASS}
        />
      </label>
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
      <button type="submit" disabled={isWorking} className={PRIMARY_BUTTON_CLASS}>
        {isWorking ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ShieldLockIcon className="h-3.5 w-3.5" />}
        UNLOCK LOCALLY
      </button>
    </form>
  );
}

interface RecoveryFormProps {
  recoveryPhrase: string;
  passphrase: string;
  confirmation: string;
  isWorking: boolean;
  error: string | null;
  onRecoveryPhraseChange: (value: string) => void;
  onPassphraseChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

function RecoveryForm(props: RecoveryFormProps) {
  return (
    <form
      id="vault-access-recover-panel"
      aria-labelledby="vault-access-recover-tab"
      onSubmit={props.onSubmit}
      className="space-y-4"
      role="tabpanel"
    >
      <div>
        <h2 id="vault-lock-title" className="text-lg font-semibold">Recover a lost passphrase</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#e8eefb]/65">
          Recovery unwraps the same vault key locally, then replaces the passphrase wrapper before private screens open.
        </p>
      </div>
      <label className="block">
        <span className="mb-1.5 block font-mono text-[10px] tracking-widest text-[#e8eefb]/55">24-WORD RECOVERY PHRASE</span>
        <textarea
          value={props.recoveryPhrase}
          onChange={(event) => props.onRecoveryPhraseChange(event.target.value)}
          rows={4}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required
          className={FIELD_CLASS}
        />
      </label>
      <PassphraseFields
        passphrase={props.passphrase}
        confirmation={props.confirmation}
        onPassphraseChange={props.onPassphraseChange}
        onConfirmationChange={props.onConfirmationChange}
        confirmationLabel="Confirm New Vault Passphrase"
        label="New Vault Passphrase"
      />
      {props.error && <p role="alert" className="text-xs text-rose-300">{props.error}</p>}
      <button type="submit" disabled={props.isWorking} className={PRIMARY_BUTTON_CLASS}>
        {props.isWorking ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
        RECOVER AND REPLACE PASSPHRASE
      </button>
    </form>
  );
}
