"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
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

const COPIED_FEEDBACK_MS = 2000;

type ToggleKey = Exclude<keyof PasswordOptions, "length">;

const TOGGLES: { key: ToggleKey; label: string; sample: string }[] = [
  { key: "lowercase", label: "lowercase", sample: "abc" },
  { key: "uppercase", label: "uppercase", sample: "ABC" },
  { key: "digits", label: "digits", sample: "012" },
  { key: "symbols", label: "symbols", sample: "#$%" },
  { key: "excludeAmbiguous", label: "exclude ambiguous", sample: "0O 1lI" },
];

function strengthLabel(bits: number): { label: string; className: string } {
  if (bits >= 100) return { label: "EXCELLENT", className: "text-emerald-300" };
  if (bits >= 75) return { label: "STRONG", className: "text-[#6ea8ff]" };
  if (bits >= 50) return { label: "FAIR", className: "text-amber-300" };
  return { label: "WEAK", className: "text-rose-300" };
}

export function PasswordGenerator() {
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS);
  // This page only mounts while unlocked, i.e. client-side, so the lazy
  // initializer never runs during server rendering.
  const [password, setPassword] = useState<string>(() => generatePassword(DEFAULT_PASSWORD_OPTIONS));
  const [copied, setCopied] = useState<boolean>(false);
  const copiedTimer = useRef<number | null>(null);

  const alphabetSize = buildAlphabet(options).length;
  const bits = entropyBits(options);
  const strength = strengthLabel(bits);

  const generateFor = (next: PasswordOptions) =>
    buildAlphabet(next).length === 0 ? "" : generatePassword(next);

  const regenerate = () => setPassword(generateFor(options));

  // Options and output change together so the shown password always matches
  // the selected settings.
  const updateOptions = (next: PasswordOptions) => {
    setOptions(next);
    setPassword(generateFor(next));
  };

  useEffect(() => {
    return () => {
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    };
  }, []);

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // Clipboard denied; no confirmation shown.
    }
  };

  return (
    <div className="space-y-4">
      <PageHeading
        eyebrow="GENERATOR"
        title="Password generator"
        description="Unbiased secure browser randomness. Generated values are never sent to the server."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <ConsolePanel title="OUTPUT" status={`${bits} BITS · ${strength.label}`} tone="green" className="h-full">
            <div
              aria-live="off"
              className="rounded border border-[#6ea8ff]/20 bg-[#070d18] px-4 py-4 font-mono text-base sm:text-lg text-[#e8eefb] break-all leading-relaxed min-h-16 selection:bg-[#6ea8ff]/40"
            >
              {password || <span className="text-[#e8eefb]/30">select at least one character set</span>}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={regenerate}
                disabled={alphabetSize === 0}
                className="inline-flex items-center gap-2 rounded bg-[#e8eefb] px-4 py-2 font-mono text-xs font-bold tracking-wider text-[#05070d] hover:bg-[#6ea8ff] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-3.5 h-3.5" /> REGENERATE
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!password}
                className={`inline-flex items-center gap-2 rounded border px-4 py-2 font-mono text-xs font-semibold tracking-wider transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  copied
                    ? "border-emerald-400/60 text-emerald-300"
                    : "border-[#6ea8ff]/40 text-[#e8eefb] hover:border-[#6ea8ff]"
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "COPIED" : "COPY"}
              </button>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-2 text-[10px] font-mono">
              <Stat label="alphabet" value={`${alphabetSize} chars`} />
              <Stat label="length" value={`${options.length}`} />
              <Stat label="entropy" value={`${bits} bits`} valueClass={strength.className} />
            </dl>

            <p className="mt-3 text-[10px] text-[#e8eefb]/35 font-mono">
              Clipboard clearing is best-effort and not guaranteed. Paste into a vault record, then lock.
            </p>
          </ConsolePanel>
        </div>

        <div className="lg:col-span-5">
          <ConsolePanel title="OPTIONS" className="h-full">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="pw-length" className="text-[10px] tracking-widest text-[#e8eefb]/55">
                    LENGTH
                  </label>
                  <span className="font-mono text-xs text-[#6ea8ff]">{options.length}</span>
                </div>
                <input
                  id="pw-length"
                  type="range"
                  min={PASSWORD_LENGTH_MIN}
                  max={PASSWORD_LENGTH_MAX}
                  value={options.length}
                  onChange={(event) => updateOptions({ ...options, length: Number(event.target.value) })}
                  className="w-full accent-[#6ea8ff]"
                />
                <div className="flex justify-between text-[10px] text-[#e8eefb]/35 font-mono">
                  <span>{PASSWORD_LENGTH_MIN}</span>
                  <span>{PASSWORD_LENGTH_MAX}</span>
                </div>
              </div>

              <ul className="space-y-1.5">
                {TOGGLES.map((toggle) => (
                  <li key={toggle.key}>
                    <label className="flex items-center justify-between gap-3 rounded border border-[#6ea8ff]/15 bg-[#070d18]/60 px-3 py-2 cursor-pointer hover:border-[#6ea8ff]/40 transition-colors">
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={options[toggle.key]}
                          onChange={(event) => updateOptions({ ...options, [toggle.key]: event.target.checked })}
                          className="accent-[#6ea8ff]"
                        />
                        <span className="text-xs text-[#e8eefb]/85">{toggle.label}</span>
                      </span>
                      <span className="font-mono text-[10px] text-[#e8eefb]/40">{toggle.sample}</span>
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

function Stat({ label, value, valueClass = "text-[#e8eefb]/85" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded border border-[#6ea8ff]/15 bg-[#070d18]/60 px-2.5 py-2">
      <dt className="tracking-widest text-[#e8eefb]/40 uppercase">{label}</dt>
      <dd className={`mt-0.5 text-xs ${valueClass}`}>{value}</dd>
    </div>
  );
}
