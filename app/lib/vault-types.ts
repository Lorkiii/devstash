import type { VaultItemType } from "./vault-data.types";

export interface VaultTypeMeta {
  label: string;
  short: string;
  /** Tailwind text color class; used for badges and icons. */
  textClass: string;
  /** Tailwind background/border classes for chips. */
  chipClass: string;
  /** Solid color for small bars and dots. */
  barClass: string;
}

export const VAULT_TYPE_ORDER: VaultItemType[] = [
  "LOGIN",
  "API_KEY",
  "DATABASE",
  "SSH_KEY",
  "RECOVERY_CODE",
  "GENERIC_SECRET",
];

export const VAULT_TYPE_META: Record<VaultItemType, VaultTypeMeta> = {
  LOGIN: {
    label: "Login",
    short: "LOGIN",
    textClass: "text-[#6ea8ff]",
    chipClass: "bg-[#6ea8ff]/10 border-[#6ea8ff]/30 text-[#6ea8ff]",
    barClass: "bg-[#6ea8ff]",
  },
  API_KEY: {
    label: "API key",
    short: "API",
    textClass: "text-[#38bdf8]",
    chipClass: "bg-[#38bdf8]/10 border-[#38bdf8]/30 text-[#38bdf8]",
    barClass: "bg-[#38bdf8]",
  },
  DATABASE: {
    label: "Database",
    short: "DB",
    textClass: "text-[#10b981]",
    chipClass: "bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]",
    barClass: "bg-[#10b981]",
  },
  SSH_KEY: {
    label: "SSH key",
    short: "SSH",
    textClass: "text-[#fb7185]",
    chipClass: "bg-[#fb7185]/10 border-[#fb7185]/30 text-[#fb7185]",
    barClass: "bg-[#fb7185]",
  },
  RECOVERY_CODE: {
    label: "Recovery codes",
    short: "RECOVERY",
    textClass: "text-[#fbbf24]",
    chipClass: "bg-[#fbbf24]/10 border-[#fbbf24]/30 text-[#fbbf24]",
    barClass: "bg-[#fbbf24]",
  },
  GENERIC_SECRET: {
    label: "Generic secret",
    short: "SECRET",
    textClass: "text-[#a78bfa]",
    chipClass: "bg-[#a78bfa]/10 border-[#a78bfa]/30 text-[#a78bfa]",
    barClass: "bg-[#a78bfa]",
  },
};
