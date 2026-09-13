"use client";

import React, { useState } from "react";
import { LoaderCircle, Save, X } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { prepareEnvBundleInput } from "@/app/lib/vault-crypto/env-bundle";
import { WORKSPACE_FIELD_LIMITS } from "@/app/lib/workspace.types";
import type { EnvBundleFormProps } from "./env-bundle-form.types";

const FIELD_CLASS = "w-full rounded border border-[#6ea8ff]/25 bg-[#05070d]/80 px-3 py-2 font-mono text-sm text-[#e8eefb] outline-none placeholder:text-[#e8eefb]/25 focus:border-[#6ea8ff]/70 disabled:opacity-60";

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
    <ConsolePanel
      title={bundle ? "EDIT .ENV BUNDLE" : "NEW .ENV BUNDLE"}
      status="WHOLE FILE ENCRYPTION"
      action={(
        <button type="button" onClick={onCancel} disabled={isSaving} className="inline-flex items-center gap-1 rounded border border-[#6ea8ff]/20 px-2 py-1 text-[10px] tracking-widest text-[#e8eefb]/65 hover:text-[#e8eefb] disabled:opacity-50">
          <X className="h-3 w-3" /> CANCEL
        </button>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs leading-relaxed text-[#e8eefb]/55">
          Variable names and values are encrypted together. Plaintext stays in this unlocked tab.
        </p>
        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-[#e8eefb]/55">ENVIRONMENT</span>
          <input value={environment} onChange={(event) => setEnvironment(event.target.value)} maxLength={WORKSPACE_FIELD_LIMITS.environmentCodePoints} placeholder="development" autoComplete="off" spellCheck={false} required disabled={isSaving} className={FIELD_CLASS} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-[#e8eefb]/55">COMPLETE .ENV CONTENT</span>
          <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={12} maxLength={WORKSPACE_FIELD_LIMITS.envContentCodePoints} placeholder="SYNTHETIC_KEY=FAKE_VALUE" autoComplete="off" spellCheck={false} disabled={isSaving} className={`${FIELD_CLASS} whitespace-pre`} />
        </label>
        {(validationError || requestError) && <p role="alert" className="text-xs text-rose-300">{validationError ?? requestError}</p>}
        <button type="submit" disabled={isSaving} className="inline-flex min-h-10 items-center gap-2 rounded border border-[#6ea8ff]/50 bg-[#6ea8ff]/15 px-4 py-2 text-xs font-semibold tracking-wider text-[#e8eefb] hover:bg-[#6ea8ff]/25 disabled:opacity-50">
          {isSaving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {bundle ? "SAVE ENCRYPTED UPDATE" : "CREATE ENCRYPTED BUNDLE"}
        </button>
      </form>
    </ConsolePanel>
  );
}
