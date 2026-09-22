"use client";

import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { MaskedValue } from "@/app/components/ui/masked-value";
import { PageHeading } from "@/app/components/ui/page-heading";
import {
  DEFAULT_PASSWORD_OPTIONS,
  PASSWORD_LENGTH_MAX,
  PASSWORD_LENGTH_MIN,
  buildAlphabet,
  entropyBits,
  generatePassword,
  type PasswordOptions,
} from "@/app/lib/password-generator";

type ToggleKey = Exclude<keyof PasswordOptions, "length">;

const TOGGLES: { key: ToggleKey; label: string; sample: string }[] = [
  { key: "lowercase", label: "lowercase", sample: "abc" },
  { key: "uppercase", label: "uppercase", sample: "ABC" },
  { key: "digits", label: "digits", sample: "012" },
  { key: "symbols", label: "symbols", sample: "#$%" },
  { key: "excludeAmbiguous", label: "exclude ambiguous", sample: "0O 1lI" },
];

function strengthLabel(bits: number): { label: string; className: string } {
  if (bits >= 100) return { label: "EXCELLENT", className: "text-emerald-700 dark:text-emerald-300" };
  if (bits >= 75) return { label: "STRONG", className: "text-accent" };
  if (bits >= 50) return { label: "FAIR", className: "text-amber-700 dark:text-amber-300" };
  return { label: "WEAK", className: "text-rose-700 dark:text-rose-300" };
}

export function PasswordGenerator() {
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS);
  // This page only mounts while unlocked, i.e. client-side, so the lazy
  // initializer never runs during server rendering.
  const [password, setPassword] = useState<string>(() => generatePassword(DEFAULT_PASSWORD_OPTIONS));
  const [generation, setGeneration] = useState(0);

  const alphabetSize = buildAlphabet(options).length;
  const bits = entropyBits(options);
  const strength = strengthLabel(bits);

  const generateFor = (next: PasswordOptions) =>
    buildAlphabet(next).length === 0 ? "" : generatePassword(next);

  const regenerate = () => {
    setPassword(generateFor(options));
    setGeneration((current) => current + 1);
  };

  // Options and output change together so the shown password always matches
  // the selected settings.
  const updateOptions = (next: PasswordOptions) => {
    setOptions(next);
    setPassword(generateFor(next));
    setGeneration((current) => current + 1);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <PageHeading
        eyebrow="GENERATOR"
        title="Password generator"
        description="Unbiased secure browser randomness. Generated values are never sent to the server."
      />

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ConsolePanel title="OUTPUT" status={`${bits} BITS · ${strength.label}`} tone="green" className="h-full">
            {password ? (
              <MaskedValue
                key={generation}
                value={password}
                label="Generated password"
                revealSeconds={15}
                wrap
              />
            ) : (
              <div className="min-h-12 rounded border border-accent/20 bg-surface-muted px-2.5 py-2.5 font-mono text-xs text-subtle-foreground sm:min-h-16 sm:px-4 sm:py-4 sm:text-sm">
                select at least one character set
              </div>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:mt-3">
              <button
                type="button"
                onClick={regenerate}
                disabled={alphabetSize === 0}
                className="inline-flex min-h-9 items-center gap-2 rounded bg-foreground px-3 py-1.5 font-mono text-[11px] font-bold tracking-wider text-accent-foreground hover:bg-accent transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed sm:min-h-10 sm:px-4 sm:py-2 sm:text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> REGENERATE
              </button>
            </div>

            <dl className="mt-3 grid grid-cols-3 gap-1.5 font-mono text-[9px] sm:mt-4 sm:gap-2 sm:text-[10px]">
              <Stat label="alphabet" value={`${alphabetSize} chars`} />
              <Stat label="length" value={`${options.length}`} />
              <Stat label="entropy" value={`${bits} bits`} valueClass={strength.className} />
            </dl>

            <p className="mt-2.5 font-mono text-[9px] leading-4 text-subtle-foreground sm:mt-3 sm:text-[10px]">
              Output is masked by default. Reveal and copy are explicit; clipboard clearing after 30 seconds is best-effort, not guaranteed.
            </p>
          </ConsolePanel>
        </div>

        <div className="lg:col-span-5">
          <ConsolePanel title="OPTIONS" className="h-full">
            <div className="space-y-3 sm:space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between sm:mb-1.5">
                  <label htmlFor="pw-length" className="text-[9px] tracking-widest text-muted-foreground sm:text-[10px]">
                    LENGTH
                  </label>
                  <span className="font-mono text-[11px] text-accent sm:text-xs">{options.length}</span>
                </div>
                <input
                  id="pw-length"
                  type="range"
                  min={PASSWORD_LENGTH_MIN}
                  max={PASSWORD_LENGTH_MAX}
                  value={options.length}
                  onChange={(event) => updateOptions({ ...options, length: Number(event.target.value) })}
                  className="w-full accent-accent"
                />
                <div className="flex justify-between font-mono text-[9px] text-subtle-foreground sm:text-[10px]">
                  <span>{PASSWORD_LENGTH_MIN}</span>
                  <span>{PASSWORD_LENGTH_MAX}</span>
                </div>
              </div>

              <ul className="space-y-1 sm:space-y-1.5">
                {TOGGLES.map((toggle) => (
                  <li key={toggle.key}>
                    <label className="flex cursor-pointer items-center justify-between gap-2 rounded border border-accent/15 bg-surface-muted/60 px-2.5 py-1.5 transition-colors hover:border-accent/40 sm:gap-3 sm:px-3 sm:py-2">
                      <span className="flex items-center gap-2.5 sm:gap-3">
                        <input
                          type="checkbox"
                          checked={options[toggle.key]}
                          onChange={(event) => updateOptions({ ...options, [toggle.key]: event.target.checked })}
                          className="accent-accent"
                        />
                        <span className="text-[11px] text-foreground/85 sm:text-xs">{toggle.label}</span>
                      </span>
                      <span className="font-mono text-[9px] text-subtle-foreground sm:text-[10px]">{toggle.sample}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </ConsolePanel>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, valueClass = "text-foreground/85" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="min-w-0 rounded border border-accent/15 bg-surface-muted/60 px-2 py-1.5 sm:px-2.5 sm:py-2">
      <dt className="truncate tracking-widest text-subtle-foreground uppercase">{label}</dt>
      <dd className={`mt-0.5 truncate text-[10px] sm:text-xs ${valueClass}`}>{value}</dd>
    </div>
  );
}
