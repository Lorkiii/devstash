"use client";

import React, { useState } from "react";
import { LoaderCircle, Save, X } from "lucide-react";
import { prepareEnvBundleInput } from "@/app/lib/vault-crypto/env-bundle";
import { WORKSPACE_FIELD_LIMITS } from "@/app/lib/workspace.types";
import type { EnvBundleFormProps } from "./env-bundle-form.types";

const FIELD_CLASS = "w-full rounded border border-accent/25 bg-background/80 px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-subtle-foreground focus:border-accent/70 disabled:opacity-60";

export function EnvBundleForm({ projectId, bundle, isSaving, requestError, onCancel, onSubmit }: EnvBundleFormProps) {
  const [environment, setEnvironment] = useState(bundle?.environment ?? "");
  const [content, setContent] = useState(bundle?.content ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    try {
      await onSubmit(prepareEnvBundleInput({ projectId, environment, content }));
    } catch (error) {
      if (error instanceof Error && error.name === "VaultCryptoValidationError") {
        setValidationError("Check the environment name and bundle size, then try again.");
        return;
      }
      throw error;
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-busy={isSaving} className="space-y-4">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Variable names and values are encrypted together. Plaintext stays in this unlocked tab.
      </p>
      <label className="block">
        <span className="mb-1.5 block text-[10px] tracking-widest text-muted-foreground">ENVIRONMENT</span>
        <input value={environment} onChange={(event) => setEnvironment(event.target.value)} maxLength={WORKSPACE_FIELD_LIMITS.environmentCodePoints} placeholder="development" autoComplete="off" spellCheck={false} autoFocus required disabled={isSaving} className={FIELD_CLASS} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[10px] tracking-widest text-muted-foreground">COMPLETE .ENV CONTENT</span>
        <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={12} maxLength={WORKSPACE_FIELD_LIMITS.envContentCodePoints} placeholder="SYNTHETIC_KEY=FAKE_VALUE" autoComplete="off" spellCheck={false} disabled={isSaving} className={`${FIELD_CLASS} whitespace-pre`} />
      </label>
      {(validationError || requestError) && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{validationError ?? requestError}</p>}
      <div className="flex flex-col-reverse gap-2 border-t border-accent/15 pt-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={isSaving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-accent/20 px-4 py-2 text-xs tracking-wider text-muted-foreground hover:bg-accent/5 hover:text-foreground disabled:opacity-50 sm:w-auto">
          <X className="h-3.5 w-3.5" /> CANCEL
        </button>
        <button type="submit" disabled={isSaving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-accent/50 bg-accent/15 px-4 py-2 text-xs font-semibold tracking-wider text-foreground hover:bg-accent/25 disabled:opacity-50 sm:w-auto">
          {isSaving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {bundle ? "SAVE ENCRYPTED UPDATE" : "CREATE ENCRYPTED BUNDLE"}
        </button>
      </div>
    </form>
  );
}
