"use client";

import React, { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Eye, EyeOff, LoaderCircle, Plus, Save, Trash2, X } from "lucide-react";
import {
  ENV_IMPORT_KEY_MAX_CODE_POINTS,
  ENV_IMPORT_MAX_ROWS,
  WorkspaceFileImportError,
  serializeEnvImportRows,
  validateEnvImportRows,
  type EnvImportDraft,
  type EnvImportRow,
} from "@/app/lib/workspace-file-import";
import { prepareEnvBundleInput } from "@/app/lib/vault-crypto/env-bundle";
import { WORKSPACE_FIELD_LIMITS, type EnvBundleInput } from "@/app/lib/workspace.types";

const REVEAL_DURATION_MS = 15_000;
const FIELD_CLASS = "w-full rounded-lg border border-accent/25 bg-background/80 px-3 py-2 font-mono text-[13px] text-foreground outline-none placeholder:text-subtle-foreground focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/15 disabled:opacity-60 sm:text-sm";
const ICON_BUTTON_CLASS = "inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-accent/20 bg-background/55 text-muted-foreground transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45 disabled:opacity-45 dark:hover:text-cyan-200";

interface EnvBundleImportFormProps {
  projectId: string;
  draft: EnvImportDraft;
  isSaving: boolean;
  requestError: string | null;
  onCancel: () => void;
  onSubmit: (input: EnvBundleInput) => Promise<void>;
}

interface ImportActionButtonProps {
  isSaving: boolean;
  canSubmit?: boolean;
  onCancel?: () => void;
}

function copyRows(rows: readonly EnvImportRow[]): EnvImportRow[] {
  return rows.map((row) => ({
    ...row,
    issue: row.issue ? { ...row.issue } : null,
  }));
}

function clearRows(rows: EnvImportRow[]): void {
  for (const row of rows) {
    row.key = "";
    row.value = "";
    row.issue = null;
  }
  rows.length = 0;
}

class SensitiveEnvImportDraftStore {
  private environment: string;
  private readonly rows: EnvImportRow[];
  private readonly listeners = new Set<() => void>();
  private revision = 0;

  constructor(draft: EnvImportDraft) {
    this.environment = draft.environment;
    this.rows = copyRows(draft.rows);
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.revision;

  getEnvironment(): string {
    return this.environment;
  }

  getRows(): EnvImportRow[] {
    return this.rows;
  }

  setEnvironment(environment: string): void {
    this.environment = environment;
    this.emit();
  }

  updateRow(rowId: number, field: "key" | "value", value: string): void {
    const row = this.rows.find((candidate) => candidate.rowId === rowId);
    if (!row) return;
    row[field] = value;
    row.issue = null;
    this.emit();
  }

  addRow(row: EnvImportRow): void {
    this.rows.push(row);
    this.emit();
  }

  removeRow(rowId: number): void {
    const index = this.rows.findIndex((row) => row.rowId === rowId);
    if (index < 0) return;
    const [removed] = this.rows.splice(index, 1);
    removed.key = "";
    removed.value = "";
    removed.issue = null;
    this.emit();
  }

  clear(notify = true): void {
    this.environment = "";
    clearRows(this.rows);
    if (notify) this.emit();
  }

  private emit(): void {
    this.revision += 1;
    for (const listener of this.listeners) listener();
  }
}

function ImportCancelButton({ isSaving, onCancel }: ImportActionButtonProps) {
  return (
    <button type="button" onClick={onCancel} disabled={isSaving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-accent/20 px-4 py-2 text-[11px] tracking-wider text-muted-foreground transition-colors hover:bg-accent/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50 sm:w-auto sm:text-xs">
      <X className="h-3.5 w-3.5" /> CANCEL
    </button>
  );
}

function ImportSubmitButton({ isSaving, canSubmit = false }: ImportActionButtonProps) {
  return (
    <button type="submit" disabled={!canSubmit} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-400/15 px-4 py-2 text-[11px] font-semibold tracking-wider text-foreground transition-colors hover:bg-cyan-400/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:text-xs">
      {isSaving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
      CREATE ENCRYPTED BUNDLE
    </button>
  );
}

export function EnvBundleImportForm({
  projectId,
  draft,
  isSaving,
  requestError,
  onCancel,
  onSubmit,
}: EnvBundleImportFormProps) {
  const formId = useId();
  const draftStore = useMemo(() => new SensitiveEnvImportDraftStore(draft), [draft]);
  const draftRevision = useSyncExternalStore(
    draftStore.subscribe,
    draftStore.getSnapshot,
    draftStore.getSnapshot,
  );
  const [revealedRowIds, setRevealedRowIds] = useState<Set<number>>(() => new Set());
  const [validationError, setValidationError] = useState<string | null>(null);
  const revealTimersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const revealAllTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lifecycleEpochRef = useRef(0);
  const nextRowIdRef = useRef(Math.max(0, ...draft.rows.map((row) => row.rowId)) + 1);
  const pendingFocusRowRef = useRef<number | null>(null);
  const environment = draftStore.getEnvironment();
  const rows = draftStore.getRows();

  const validatedRows = validateEnvImportRows(rows);
  const issueCount = validatedRows.reduce((total, row) => total + (row.issue ? 1 : 0), 0);
  const environmentError = environment.trim().length === 0
    ? "Enter an environment name."
    : Array.from(environment).length > WORKSPACE_FIELD_LIMITS.environmentCodePoints
      ? `Environment names must be at most ${WORKSPACE_FIELD_LIMITS.environmentCodePoints} characters.`
      : null;
  const serializationError = (() => {
    if (validatedRows.length === 0 || issueCount > 0) return null;
    try {
      serializeEnvImportRows(validatedRows);
      return null;
    } catch (error) {
      return error instanceof WorkspaceFileImportError
        ? error.message
        : "The reviewed variables could not be serialized safely.";
    }
  })();
  const summaryError = environmentError ??
    (validatedRows.length === 0 ? "Add at least one variable before creating the bundle." : null) ??
    (issueCount > 0
      ? `${issueCount} ${issueCount === 1 ? "variable needs" : "variables need"} attention before this bundle can be created.`
      : null) ??
    serializationError;
  const canSubmit = !isSaving && !summaryError;
  const allRevealed = rows.length > 0 && rows.every((row) => revealedRowIds.has(row.rowId));

  useEffect(() => {
    const rowId = pendingFocusRowRef.current;
    if (rowId === null) return;
    pendingFocusRowRef.current = null;
    document.getElementById(`${formId}-key-${rowId}`)?.focus();
  }, [draftRevision, formId]);

  useEffect(() => {
    const revealTimers = revealTimersRef.current;
    lifecycleEpochRef.current += 1;
    return () => {
      const cleanupEpoch = lifecycleEpochRef.current + 1;
      lifecycleEpochRef.current = cleanupEpoch;
      queueMicrotask(() => {
        // Strict Mode immediately mounts the effect again; a real unmount does not.
        if (lifecycleEpochRef.current !== cleanupEpoch) return;
        for (const timer of revealTimers.values()) clearTimeout(timer);
        revealTimers.clear();
        if (revealAllTimerRef.current) clearTimeout(revealAllTimerRef.current);
        revealAllTimerRef.current = null;
        draftStore.clear(false);
      });
    };
  }, [draftStore]);

  const clearRevealTimer = (rowId: number) => {
    const timer = revealTimersRef.current.get(rowId);
    if (timer) clearTimeout(timer);
    revealTimersRef.current.delete(rowId);
  };

  const hideAll = () => {
    for (const timer of revealTimersRef.current.values()) clearTimeout(timer);
    revealTimersRef.current.clear();
    if (revealAllTimerRef.current) clearTimeout(revealAllTimerRef.current);
    revealAllTimerRef.current = null;
    setRevealedRowIds(new Set());
  };

  const toggleRowReveal = (rowId: number) => {
    if (revealedRowIds.has(rowId)) {
      clearRevealTimer(rowId);
      setRevealedRowIds((current) => {
        const next = new Set(current);
        next.delete(rowId);
        return next;
      });
      return;
    }

    clearRevealTimer(rowId);
    setRevealedRowIds((current) => new Set(current).add(rowId));
    revealTimersRef.current.set(rowId, setTimeout(() => {
      revealTimersRef.current.delete(rowId);
      setRevealedRowIds((current) => {
        const next = new Set(current);
        next.delete(rowId);
        return next;
      });
    }, REVEAL_DURATION_MS));
  };

  const toggleRevealAll = () => {
    if (allRevealed) {
      hideAll();
      return;
    }

    for (const timer of revealTimersRef.current.values()) clearTimeout(timer);
    revealTimersRef.current.clear();
    if (revealAllTimerRef.current) clearTimeout(revealAllTimerRef.current);
    setRevealedRowIds(new Set(rows.map((row) => row.rowId)));
    revealAllTimerRef.current = setTimeout(() => {
      revealAllTimerRef.current = null;
      setRevealedRowIds(new Set());
    }, REVEAL_DURATION_MS);
  };

  const updateRow = (rowId: number, field: "key" | "value", value: string) => {
    setValidationError(null);
    draftStore.updateRow(rowId, field, value);
  };

  const addRow = () => {
    const rowId = nextRowIdRef.current;
    nextRowIdRef.current += 1;
    pendingFocusRowRef.current = rowId;
    setValidationError(null);
    draftStore.addRow({ rowId, sourceLine: null, key: "", value: "", issue: null });
  };

  const removeRow = (rowId: number) => {
    clearRevealTimer(rowId);
    setRevealedRowIds((current) => {
      const next = new Set(current);
      next.delete(rowId);
      return next;
    });
    setValidationError(null);
    draftStore.removeRow(rowId);
  };

  const handleCancel = () => {
    hideAll();
    draftStore.clear();
    onCancel();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    if (!canSubmit) {
      setValidationError("Correct the review errors before creating this encrypted bundle.");
      return;
    }

    let input: EnvBundleInput | null = null;
    try {
      input = prepareEnvBundleInput({
        projectId,
        environment,
        content: serializeEnvImportRows(validatedRows),
      });
      await onSubmit(input);
    } catch (error) {
      if (error instanceof WorkspaceFileImportError || (error instanceof Error && error.name === "VaultCryptoValidationError")) {
        setValidationError(error.message || "Check the environment name and imported variables, then try again.");
        return;
      }
      throw error;
    } finally {
      if (input) {
        input.environment = "";
        input.content = "";
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-busy={isSaving} className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-cyan-400/15 bg-cyan-400/[0.025] px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="block min-w-0 flex-1">
            <span className="mb-1.5 block text-[9px] tracking-widest text-muted-foreground sm:text-[10px]">ENVIRONMENT</span>
            <input
              value={environment}
              onChange={(event) => {
                setValidationError(null);
                draftStore.setEnvironment(event.target.value);
              }}
              maxLength={WORKSPACE_FIELD_LIMITS.environmentCodePoints}
              placeholder="development"
              autoComplete="off"
              spellCheck={false}
              autoFocus
              required
              disabled={isSaving}
              aria-invalid={Boolean(environmentError)}
              className={FIELD_CLASS}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={toggleRevealAll}
              disabled={isSaving || rows.length === 0}
              aria-pressed={allRevealed}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-accent/25 bg-background/65 px-3 text-[10px] tracking-wider text-muted-foreground transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45 disabled:opacity-45 sm:min-h-11"
            >
              {allRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {allRevealed ? "HIDE ALL" : "REVEAL ALL"}
            </button>
            <button
              type="button"
              onClick={addRow}
              disabled={isSaving || rows.length >= ENV_IMPORT_MAX_ROWS}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-400/10 px-3 text-[10px] tracking-wider text-cyan-800 transition-colors hover:bg-cyan-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45 disabled:opacity-45 dark:text-cyan-200 sm:min-h-11"
            >
              <Plus className="h-3.5 w-3.5" /> ADD VARIABLE
            </button>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-[11px] text-muted-foreground sm:text-xs">
          <span className="font-medium text-foreground">{rows.length.toLocaleString("en-US")} {rows.length === 1 ? "variable" : "variables"}</span>
          <span>{draft.skippedLineCount.toLocaleString("en-US")} comments or blank lines skipped</span>
          <span>Values hide again after 15 seconds.</span>
        </div>
        {summaryError && (
          <p role="alert" aria-live="polite" className="mt-2 text-[11px] text-rose-700 dark:text-rose-300 sm:text-xs">
            {summaryError}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-label="Imported environment variables">
        <div className="sticky top-0 z-10 hidden grid-cols-[4rem_minmax(9rem,0.75fr)_minmax(12rem,1.25fr)_5.5rem] gap-3 border-b border-accent/15 bg-background/95 px-6 py-2 text-[9px] tracking-widest text-subtle-foreground backdrop-blur-sm sm:grid">
          <span>SOURCE</span>
          <span>KEY</span>
          <span>VALUE</span>
          <span className="text-right">ACTIONS</span>
        </div>
        <ol className="divide-y divide-accent/12">
          {validatedRows.map((row, index) => {
            const revealed = revealedRowIds.has(row.rowId);
            const issueId = `${formId}-issue-${row.rowId}`;
            const rowLabel = row.sourceLine ? `source line ${row.sourceLine}` : `new row ${index + 1}`;
            return (
              <li
                key={row.rowId}
                className={`px-3 py-3 sm:px-6 sm:py-3.5 ${row.issue ? "bg-rose-400/[0.035]" : "bg-transparent"}`}
              >
                <div className="grid gap-2.5 sm:grid-cols-[4rem_minmax(9rem,0.75fr)_minmax(12rem,1.25fr)_5.5rem] sm:items-start sm:gap-3">
                  <div className="flex items-center justify-between sm:block">
                    <span className="text-[9px] tracking-widest text-subtle-foreground sm:hidden">SOURCE</span>
                    <span className="inline-flex min-h-7 items-center rounded border border-accent/15 bg-background/55 px-2 text-[9px] tabular-nums tracking-wider text-muted-foreground">
                      {row.sourceLine ? `LINE ${row.sourceLine}` : "NEW"}
                    </span>
                  </div>
                  <label className="block min-w-0">
                    <span className="mb-1 block text-[9px] tracking-widest text-subtle-foreground sm:sr-only">KEY</span>
                    <input
                      id={`${formId}-key-${row.rowId}`}
                      value={row.key}
                      onChange={(event) => updateRow(row.rowId, "key", event.target.value)}
                      maxLength={ENV_IMPORT_KEY_MAX_CODE_POINTS}
                      placeholder="VARIABLE_NAME"
                      autoComplete="off"
                      spellCheck={false}
                      disabled={isSaving}
                      aria-label={`Key for ${rowLabel}`}
                      aria-invalid={Boolean(row.issue)}
                      aria-describedby={row.issue ? issueId : undefined}
                      className={FIELD_CLASS}
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className="mb-1 block text-[9px] tracking-widest text-subtle-foreground sm:sr-only">VALUE</span>
                    <input
                      type={revealed ? "text" : "password"}
                      value={row.value}
                      onChange={(event) => updateRow(row.rowId, "value", event.target.value)}
                      maxLength={WORKSPACE_FIELD_LIMITS.envContentCodePoints}
                      placeholder="value"
                      autoComplete="off"
                      spellCheck={false}
                      disabled={isSaving}
                      aria-label={`Value for ${rowLabel}`}
                      aria-invalid={Boolean(row.issue)}
                      aria-describedby={row.issue ? issueId : undefined}
                      className={FIELD_CLASS}
                    />
                  </label>
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleRowReveal(row.rowId)}
                      disabled={isSaving}
                      aria-label={revealed ? `Hide value for ${rowLabel}` : `Reveal value for ${rowLabel}`}
                      aria-pressed={revealed}
                      className={ICON_BUTTON_CLASS}
                    >
                      {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(row.rowId)}
                      disabled={isSaving}
                      aria-label={`Remove ${rowLabel}`}
                      className={`${ICON_BUTTON_CLASS} hover:border-rose-400/40 hover:bg-rose-400/10 hover:text-rose-700 dark:hover:text-rose-300`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {row.issue && (
                  <p id={issueId} className="mt-2 font-sans text-[11px] leading-4 text-rose-700 dark:text-rose-300 sm:ml-[4.75rem] sm:text-xs">
                    {row.issue.message}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
        {rows.length === 0 && (
          <div className="grid min-h-40 place-items-center px-6 py-10 text-center">
            <div>
              <p className="text-xs font-semibold text-foreground">No variables in this review.</p>
              <p className="mt-1 font-sans text-[11px] text-muted-foreground">Add a variable to continue, or cancel this import.</p>
              <button type="button" onClick={addRow} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-400/10 px-4 text-[10px] tracking-wider text-cyan-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45 dark:text-cyan-200">
                <Plus className="h-3.5 w-3.5" /> ADD VARIABLE
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="devstash-panel-header shrink-0 border-t px-3 py-3 sm:px-6 sm:py-3.5">
        {(validationError || requestError) && (
          <p role="alert" className="mb-2.5 font-sans text-[11px] text-rose-700 dark:text-rose-300 sm:text-xs">
            {validationError ?? requestError}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:hidden">
          <ImportSubmitButton isSaving={isSaving} canSubmit={canSubmit} />
          <ImportCancelButton isSaving={isSaving} onCancel={handleCancel} />
        </div>
        <div className="hidden items-center justify-end gap-2 sm:flex">
          <ImportCancelButton isSaving={isSaving} onCancel={handleCancel} />
          <ImportSubmitButton isSaving={isSaving} canSubmit={canSubmit} />
        </div>
      </div>
    </form>
  );
}
