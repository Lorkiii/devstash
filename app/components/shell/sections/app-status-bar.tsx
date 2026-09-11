"use client";

import React from "react";
import { formatCountdown } from "@/app/lib/format";

interface AppStatusBarProps {
  isUnlocked: boolean;
  recordCount: number;
  secondsUntilAutoLock: number | null;
}

// tmux/VS Code style status line. Only non-sensitive metadata appears here.
export function AppStatusBar({ isUnlocked, recordCount, secondsUntilAutoLock }: AppStatusBarProps) {
  const segments: string[] = [
    "argon2id · v1 candidate",
    "aes-256-gcm",
    isUnlocked ? `${recordCount} records in memory` : "0 records in memory",
  ];
  if (isUnlocked && secondsUntilAutoLock !== null) {
    segments.push(`lock in ${formatCountdown(secondsUntilAutoLock)}`);
  }

  return (
    <footer className="relative z-20 h-7 shrink-0 border-t border-[#6ea8ff]/15 bg-[#05070d]/85 backdrop-blur-md">
      <div className="h-full px-3 sm:px-4 lg:px-6 flex items-center justify-between font-mono text-[10px] tracking-wider text-[#e8eefb]/50">
        <div className="flex items-center gap-2 min-w-0 truncate">
          <span className="text-[#6ea8ff]">◇</span>
          {segments.map((segment, index) => (
            <React.Fragment key={segment}>
              {index > 0 && <span className="text-[#e8eefb]/25">·</span>}
              <span className="truncate">{segment}</span>
            </React.Fragment>
          ))}
        </div>
        <span className="shrink-0 text-amber-300/80">PHASE 5 · LOCAL LIFECYCLE</span>
      </div>
    </footer>
  );
}
