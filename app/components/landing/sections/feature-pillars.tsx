"use client";

import React from "react";
import { KeyIcon, FileCodeIcon, DatabaseIcon, LayersIcon } from "@/app/components/ui/icons";
import type { Capability } from "./feature-pillars.types";

const CAPABILITIES: Capability[] = [
  {
    id: "secrets",
    title: "Secrets & Credentials",
    summary:
      "Logins, API keys, tokens, database and SSH credentials, and recovery codes. Masked by default, timed reveal, explicit copy.",
    icon: <KeyIcon className="w-4 h-4 text-[#6ea8ff]" />,
  },
  {
    id: "env",
    title: ".env Bundles",
    summary:
      "Whole environment files stored as one encrypted record, including variable names and values.",
    icon: <FileCodeIcon className="w-4 h-4 text-[#38bdf8]" />,
  },
  {
    id: "notes",
    title: "Private Notes",
    summary:
      "Markdown notes, sanitized on render, searched locally after decryption in the browser.",
    icon: <DatabaseIcon className="w-4 h-4 text-[#a78bfa]" />,
  },
  {
    id: "projects",
    title: "Projects & Tasks",
    summary:
      "Group secrets, .env bundles, notes, and tasks per project. Titles and descriptions stay encrypted.",
    icon: <LayersIcon className="w-4 h-4 text-[#10b981]" />,
  },
];

export function FeaturePillars() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {CAPABILITIES.map((capability) => (
        <div
          key={capability.id}
          className="p-3 rounded border border-[#6ea8ff]/15 bg-[#0a1220]/60"
        >
          <div className="flex items-center gap-2 mb-1">
            {capability.icon}
            <h3 className="text-xs font-semibold text-[#e8eefb]">{capability.title}</h3>
          </div>
          <p className="text-[11px] text-[#e8eefb]/65 leading-relaxed">
            {capability.summary}
          </p>
        </div>
      ))}
    </div>
  );
}
