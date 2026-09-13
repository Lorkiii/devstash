"use client";

import React, { useEffect, useState } from "react";
import { Eye, EyeOff, LoaderCircle, Save, X } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { prepareGenericSecretInput } from "@/app/lib/vault-crypto/generic-secret";
import { GENERIC_SECRET_LIMITS } from "@/app/lib/vault-item.types";
import type { GenericSecretFormProps } from "./generic-secret-form.types";

const FIELD_CLASS = "w-full rounded border border-[#6ea8ff]/25 bg-[#05070d]/80 px-3 py-2 font-mono text-sm text-[#e8eefb] outline-none placeholder:text-[#e8eefb]/25 focus:border-[#6ea8ff]/70 disabled:opacity-60";

export function GenericSecretForm({
  item,
  projects,
  isSaving,
  requestError,
  onCancel,
  onSubmit,
}: GenericSecretFormProps) {
  const [projectId, setProjectId] = useState(item?.projectId ?? "");
  const [title, setTitle] = useState(item?.title ?? "");
  const [value, setValue] = useState(item?.fields[0]?.value ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [tags, setTags] = useState(item?.tags.join(", ") ?? "");
  const [showValue, setShowValue] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!showValue) return;
    const timer = window.setTimeout(() => setShowValue(false), 10_000);
    return () => window.clearTimeout(timer);
  }, [showValue]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    setShowValue(false);
    try {
      await onSubmit(prepareGenericSecretInput({
        projectId: projectId || null,
        title,
        value,
        notes,
        tags,
      }));
    } catch (error) {
      if (error instanceof Error && error.name === "VaultCryptoValidationError") {
        setValidationError("Check the required fields and size limits, then try again.");
        return;
      }
      throw error;
    }
  };

  const actions = (
    <button
      type="button"
      onClick={onCancel}
      disabled={isSaving}
      className="inline-flex items-center gap-1 rounded border border-[#6ea8ff]/20 px-2 py-1 text-[10px] tracking-widest text-[#e8eefb]/65 hover:text-[#e8eefb] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <X className="h-3 w-3" /> CANCEL
    </button>
  );

  return (
    <ConsolePanel
      title={item ? "EDIT GENERIC SECRET" : "NEW GENERIC SECRET"}
      status="ENCRYPTS IN THIS TAB"
      action={actions}
      className="h-full"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs leading-relaxed text-[#e8eefb]/55">
          The complete form is encrypted locally as one payload. An optional project ID is authenticated as relationship metadata.
        </p>

        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-[#e8eefb]/55">
            PROJECT · OPTIONAL
          </span>
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            disabled={isSaving}
            className={FIELD_CLASS}
          >
            <option value="">Unassigned</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-[#e8eefb]/55">TITLE</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={GENERIC_SECRET_LIMITS.titleCodePoints}
            autoComplete="off"
            required
            disabled={isSaving}
            className={FIELD_CLASS}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-[#e8eefb]/55">SECRET VALUE</span>
          <span className="flex rounded border border-[#6ea8ff]/25 bg-[#05070d]/80 focus-within:border-[#6ea8ff]/70">
            <input
              type={showValue ? "text" : "password"}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              maxLength={GENERIC_SECRET_LIMITS.valueCodePoints}
              autoComplete="off"
              spellCheck={false}
              required
              disabled={isSaving}
              className="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-sm text-[#e8eefb] outline-none disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowValue((shown) => !shown)}
              disabled={isSaving}
              aria-label={showValue ? "Mask secret value" : "Reveal secret value"}
              className="px-3 text-[#6ea8ff]/70 hover:text-[#6ea8ff] disabled:opacity-50"
            >
              {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-[#e8eefb]/55">NOTES · OPTIONAL</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            maxLength={GENERIC_SECRET_LIMITS.notesCodePoints}
            autoComplete="off"
            spellCheck={false}
            disabled={isSaving}
            className={FIELD_CLASS}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-[#e8eefb]/55">TAGS · OPTIONAL</span>
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="infra, personal"
            autoComplete="off"
            spellCheck={false}
            disabled={isSaving}
            className={FIELD_CLASS}
          />
          <span className="mt-1 block text-[10px] text-[#e8eefb]/35">
            Comma-separated; up to {GENERIC_SECRET_LIMITS.tagCount} tags.
          </span>
        </label>

        {(validationError || requestError) && (
          <p role="alert" className="text-xs text-rose-300">
            {validationError ?? requestError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[#6ea8ff]/50 bg-[#6ea8ff]/15 px-4 py-2 text-xs font-semibold tracking-wider text-[#e8eefb] hover:bg-[#6ea8ff]/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {item ? "SAVE ENCRYPTED UPDATE" : "CREATE ENCRYPTED SECRET"}
        </button>
      </form>
    </ConsolePanel>
  );
}
