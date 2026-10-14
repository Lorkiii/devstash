"use client";

import { useState } from "react";
import { ArrowUpRight, FileCode2, KeyRound, ListTodo, LockKeyhole, NotebookPen, PanelsTopLeft } from "lucide-react";
import type {
  LandingVaultPreviewProps,
  PreviewModule,
  PreviewModuleId,
  PreviewRecord,
} from "./landing-vault-preview.types";

const MODULE_ICONS = {
  secrets: KeyRound,
  env: FileCode2,
  notes: NotebookPen,
  tasks: ListTodo,
};

function PreviewRecordDetail({ record }: { record: PreviewRecord }) {
  return (
    <div className="min-h-64 px-4 py-6 sm:px-5 sm:py-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {record.title}
          </h3>
          <p className="mt-2 font-mono text-[10px] tracking-[0.08em] text-subtle-foreground sm:text-[11px]">
            {record.meta}
          </p>
        </div>
        <span className="rounded-md bg-surface-strong px-2 py-1 text-[10px] font-medium tracking-[0.06em] text-muted-foreground">
          SAMPLE
        </span>
      </div>

      {record.kind === "secret" && (
        <>
          <div className="mt-6 border-y border-border/50 py-4 font-mono">
            <span className="text-[10px] tracking-[0.1em] text-subtle-foreground">VALUE / MASKED</span>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span aria-label="Masked sample value" className="text-xl tracking-[0.18em] text-foreground sm:text-2xl">
                •••• •••• ••••
              </span>
              <LockKeyhole className="h-4 w-4 shrink-0 text-subtle-foreground" aria-hidden="true" />
            </div>
          </div>
          <p className="mt-4 max-w-sm text-xs leading-6 text-muted-foreground sm:text-sm">
            {record.description}
          </p>
        </>
      )}

      {record.kind === "env" && (
        <>
          <div className="mt-5 border-y border-border/50 py-2 font-mono text-xs">
            {record.variables.map((name) => (
              <div key={name} className="flex min-w-0 items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate text-foreground">{name}</span>
                <span aria-label="Masked sample value" className="shrink-0 tracking-[0.1em] text-accent-strong">
                  = ••••••••
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-6 text-muted-foreground sm:text-sm">
            Real .env variable names and values are encrypted in the browser.
          </p>
        </>
      )}

      {record.kind === "note" && (
        <div className="mt-5 space-y-3 text-sm leading-7 text-muted-foreground">
          {record.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      )}

      {record.kind === "task" && (
        <>
          <div className="mt-6 flex items-center gap-2 border-y border-border/50 py-4 font-mono text-[11px] tracking-[0.06em]">
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${
                record.status === "DONE"
                  ? "bg-emerald-400"
                  : record.status === "IN PROGRESS"
                    ? "bg-amber-400"
                    : "bg-subtle-foreground"
              }`}
            />
            <span className="text-subtle-foreground">STATUS</span>
            <span className="ml-auto font-semibold text-foreground">{record.status}</span>
          </div>
          <p className="mt-4 max-w-sm text-xs leading-6 text-muted-foreground sm:text-sm">
            {record.description}
          </p>
        </>
      )}
    </div>
  );
}

export function LandingVaultPreview({ modules }: LandingVaultPreviewProps) {
  const [activeModuleId, setActiveModuleId] = useState<PreviewModuleId>(
    modules[0]?.id ?? "secrets"
  );
  const [activeRecordId, setActiveRecordId] = useState(modules[0]?.records[0]?.id ?? "");
  const activeModule = modules.find((module) => module.id === activeModuleId) ?? modules[0];
  const activeRecord = activeModule?.records.find((record) => record.id === activeRecordId)
    ?? activeModule?.records[0];

  if (!activeModule) return null;

  const selectModule = (module: PreviewModule) => {
    setActiveModuleId(module.id);
    setActiveRecordId(module.records[0]?.id ?? "");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-[10px] font-medium tracking-[0.08em] text-muted-foreground sm:text-[11px]">
        <span>EXPLORE THE SAMPLE WORKSPACE</span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-accent-strong" aria-hidden="true" />
      </div>
      <section aria-label="Interactive sample vault workspace" className="landing-preview relative isolate overflow-hidden rounded-2xl text-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-surface-muted px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2.5 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground sm:text-[11px]">
            <PanelsTopLeft className="h-4 w-4 text-accent-strong" aria-hidden="true" />
            DEVSTASH / FIELD VIEW
          </div>
          <span className="flex items-center gap-1.5 text-[9px] font-medium tracking-[0.06em] text-muted-foreground sm:text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden="true" />
            INTERACTIVE SAMPLE
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-4 py-5 sm:px-5 sm:py-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
              Northstar<span className="text-accent-strong">.</span>
            </h2>
            <p className="mt-1.5 font-mono text-[10px] tracking-[0.08em] text-subtle-foreground">
              SAMPLE PROJECT / 001
            </p>
          </div>
          <span className="text-right text-[10px] leading-5 tracking-[0.06em] text-subtle-foreground sm:text-[11px]">
            FOUR MODULES<br />ONE WORKSPACE
          </span>
        </div>

        <div className="sm:grid sm:grid-cols-[120px_minmax(0,1fr)] xl:grid-cols-[140px_minmax(0,1fr)]">
          <nav aria-label="Sample workspace modules" className="grid grid-cols-4 border-b border-border/50 bg-surface-muted/60 sm:flex sm:flex-col sm:gap-1 sm:border-r sm:border-b-0 sm:py-3">
            {modules.map((module) => {
              const selected = activeModule.id === module.id;
              const ModuleIcon = MODULE_ICONS[module.id];
              return (
                <button
                  key={module.id}
                  type="button"
                  aria-pressed={selected}
                  aria-controls="landing-preview-detail"
                  onClick={() => selectModule(module)}
                  className={`flex min-h-16 min-w-0 cursor-pointer flex-col items-center justify-center gap-2 border-b px-2 py-3 transition-colors duration-200 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent motion-reduce:transition-none sm:min-h-12 sm:flex-row sm:justify-start sm:gap-2.5 sm:border-b-0 sm:border-l sm:px-4 ${
                    selected
                      ? "border-accent bg-accent/10 text-accent-strong"
                      : "border-transparent text-muted-foreground hover:bg-accent/8 hover:text-foreground"
                  }`}
                >
                  <ModuleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate text-xs font-semibold">{module.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-4 py-4 sm:px-5">
              <div>
                <p className="text-xs font-medium text-foreground sm:text-sm">
                  {activeModule.caption}
                </p>
                <p className="mt-1.5 font-mono text-[10px] tracking-[0.08em] text-subtle-foreground">
                  MODULE / {activeModule.number}
                </p>
              </div>
              <span className="font-mono text-[10px] tracking-[0.06em] text-subtle-foreground">
                {String(activeModule.records.length).padStart(2, "0")} SAMPLES
              </span>
            </div>

            <div className="grid grid-cols-2 divide-x divide-border/50 border-b border-border/50">
              {activeModule.records.map((record) => {
                const selected = activeRecord?.id === record.id;
                return (
                  <button
                    key={record.id}
                    type="button"
                    aria-pressed={selected}
                    aria-controls="landing-preview-detail"
                    onClick={() => setActiveRecordId(record.id)}
                    className={`min-h-17 min-w-0 cursor-pointer border-b px-3 py-3 text-left transition-colors duration-200 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent motion-reduce:transition-none sm:px-5 ${
                      selected
                        ? "border-accent bg-accent/7"
                        : "border-transparent hover:bg-accent/7"
                    }`}
                  >
                    <span className="block truncate text-xs font-semibold text-foreground">
                      {record.title}
                    </span>
                    <span className="mt-1.5 block truncate font-mono text-[9px] tracking-[0.02em] text-subtle-foreground sm:text-[10px]">
                      {record.meta}
                    </span>
                  </button>
                );
              })}
            </div>

            <div id="landing-preview-detail">
              {activeRecord ? (
                <PreviewRecordDetail record={activeRecord} />
              ) : (
                <p className="px-5 py-8 text-sm text-muted-foreground">No sample records in this module.</p>
              )}
            </div>
            <p aria-live="polite" className="sr-only">
              Previewing {activeModule.label}: {activeRecord?.title ?? "no sample record"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border/50 bg-surface-muted px-4 py-3 text-[9px] leading-4 tracking-[0.04em] sm:px-5 sm:text-[10px]">
          <span className="font-medium text-muted-foreground">FICTIONAL RECORDS / NO LIVE VAULT DATA</span>
          <span className="text-muted-foreground">REAL VAULT: SIGN IN → UNLOCK LOCALLY</span>
        </div>
      </section>
    </div>
  );
}
