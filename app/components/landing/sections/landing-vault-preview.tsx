"use client";

import { useState } from "react";
import { OrbitIcon } from "@/app/components/ui/icons";
import type {
  LandingVaultPreviewProps,
  PreviewModule,
  PreviewModuleId,
  PreviewRecord,
} from "./landing-vault-preview.types";

function PreviewRecordDetail({ record }: { record: PreviewRecord }) {
  return (
    <div className="landing-preview-document min-h-60 px-4 py-5 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.14em] text-accent-strong">
            {record.meta}
          </p>
          <h3 className="mt-1.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {record.title}
          </h3>
        </div>
        <span className="rounded-full border border-accent/25 bg-accent/10 px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.13em] text-accent-strong">
          SAMPLE
        </span>
      </div>

      {record.kind === "secret" && (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-accent/20 py-3 font-mono">
            <span className="text-[10px] tracking-[0.14em] text-subtle-foreground">VALUE / MASKED</span>
            <span aria-label="Masked sample value" className="text-base tracking-[0.22em] text-foreground">
              •••• •••• ••••
            </span>
          </div>
          <p className="mt-4 max-w-sm text-xs leading-5 text-muted-foreground">
            {record.description}
          </p>
        </>
      )}

      {record.kind === "env" && (
        <>
          <div className="mt-4 border-y border-accent/20 py-2 font-mono text-[11px]">
            {record.variables.map((name) => (
              <div key={name} className="flex min-w-0 items-center justify-between gap-3 py-1.5">
                <span className="min-w-0 truncate text-foreground">{name}</span>
                <span aria-label="Masked sample value" className="shrink-0 tracking-[0.1em] text-accent-strong">
                  = ••••••••
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Real .env variable names and values are encrypted in the browser.
          </p>
        </>
      )}

      {record.kind === "note" && (
        <div className="mt-5 space-y-3 border-l-2 border-accent/50 pl-4 text-sm leading-6 text-muted-foreground">
          {record.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      )}

      {record.kind === "task" && (
        <>
          <div className="mt-5 flex items-center gap-2 border-y border-accent/20 py-3 font-mono text-[10px] tracking-[0.13em]">
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
          <p className="mt-4 max-w-sm text-xs leading-5 text-muted-foreground">
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
    <section aria-label="Interactive sample vault workspace" className="landing-preview relative isolate overflow-hidden rounded-[1.35rem] border text-foreground">
      <div aria-hidden="true" className="landing-preview-grid absolute inset-0" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-accent/20 px-4 py-3 font-mono sm:px-5">
          <div className="flex items-center gap-2.5 text-[10px] font-bold tracking-[0.14em] text-accent-strong">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-accent/35 bg-accent/12">
              <OrbitIcon className="h-4 w-4" />
            </span>
            DEVSTASH / FIELD VIEW
          </div>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
            INTERACTIVE SAMPLE
          </span>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-accent/20 px-4 py-4 sm:px-5">
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] text-subtle-foreground">
              SAMPLE PROJECT / 001
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-[-0.04em] text-foreground sm:text-3xl">
              Northstar<span className="text-accent-strong">.</span>
            </h2>
          </div>
          <span className="border-l border-accent/35 pl-3 font-mono text-[10px] leading-4 tracking-[0.08em] text-muted-foreground">
            FOUR MODULES<br />ONE WORKSPACE
          </span>
        </div>

        <div className="sm:grid sm:grid-cols-[126px_minmax(0,1fr)]">
          <nav aria-label="Sample workspace modules" className="grid grid-cols-4 border-b border-accent/20 bg-surface-muted/50 sm:flex sm:flex-col sm:border-r sm:border-b-0">
            {modules.map((module) => {
              const selected = activeModule.id === module.id;
              return (
                <button
                  key={module.id}
                  type="button"
                  aria-pressed={selected}
                  aria-controls="landing-preview-detail"
                  onClick={() => selectModule(module)}
                  className={`group flex min-h-12 min-w-0 flex-col justify-center border-b-2 px-2 py-2.5 text-left font-mono transition-colors duration-200 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent motion-reduce:transition-none sm:min-h-15 sm:border-b-0 sm:border-l-2 sm:px-3 ${
                    selected
                      ? "border-accent bg-accent/12 text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-accent/8 hover:text-foreground"
                  }`}
                >
                  <span className="text-[10px] tracking-widest text-accent-strong">{module.number}</span>
                  <span className="mt-0.5 truncate text-xs font-bold">{module.label}</span>
                </button>
              );
            })}
            <div aria-hidden="true" className="hidden flex-1 border-t border-accent/10 sm:block" />
          </nav>

          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-accent/20 px-4 py-3.5 sm:px-5">
              <div>
                <p className="font-mono text-[10px] tracking-[0.16em] text-accent-strong">
                  MODULE / {activeModule.number}
                </p>
                <p className="mt-1 text-xs font-medium text-foreground sm:text-sm">
                  {activeModule.caption}
                </p>
              </div>
              <span className="font-mono text-[10px] tracking-[0.12em] text-subtle-foreground">
                {String(activeModule.records.length).padStart(2, "0")} SAMPLES
              </span>
            </div>

            <div className="grid grid-cols-2 border-b border-accent/20">
              {activeModule.records.map((record) => {
                const selected = activeRecord?.id === record.id;
                return (
                  <button
                    key={record.id}
                    type="button"
                    aria-pressed={selected}
                    aria-controls="landing-preview-detail"
                    onClick={() => setActiveRecordId(record.id)}
                    className={`min-h-15 min-w-0 border-b-2 px-3 py-2.5 text-left transition-colors duration-200 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent motion-reduce:transition-none sm:px-4 ${
                      selected
                        ? "border-accent bg-accent/8"
                        : "border-transparent hover:bg-accent/7"
                    }`}
                  >
                    <span className="block truncate text-xs font-semibold text-foreground">
                      {record.title}
                    </span>
                    <span className="mt-1 block truncate font-mono text-[10px] tracking-[0.05em] text-subtle-foreground">
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

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-accent/20 bg-surface-muted/50 px-4 py-3 font-mono text-[10px] leading-4 tracking-[0.08em] sm:px-5">
          <span className="font-semibold text-accent-strong">FICTIONAL RECORDS / NO LIVE VAULT DATA</span>
          <span className="text-muted-foreground">REAL VAULT: SIGN IN → UNLOCK LOCALLY</span>
        </div>
      </div>
    </section>
  );
}
