"use client";

import React from "react";

interface AppStatusBarProps {
  isUnlocked: boolean;
  recordCount: number;
}

// tmux/VS Code style status line. Only non-sensitive metadata appears here.
// Hidden on phones to keep the app chrome compact.
export function AppStatusBar({ isUnlocked, recordCount }: AppStatusBarProps) {
  const segments: string[] = [
    "argon2id",
    "aes-256-gcm",
    isUnlocked ? `${recordCount} records in memory` : "0 records in memory",
  ];
  return (
    <footer className="relative z-20 hidden h-7 shrink-0 border-t border-accent/15 bg-background/85 backdrop-blur-md md:block">
      <div className="flex h-full items-center px-4 font-mono text-[10px] tracking-wider text-subtle-foreground sm:px-5 lg:px-6">
        <div className="flex items-center gap-2 min-w-0 truncate">
          <span className="text-accent">◇</span>
          {segments.map((segment, index) => (
            <React.Fragment key={segment}>
              {index > 0 && <span className="text-subtle-foreground">·</span>}
              <span className="truncate">{segment}</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </footer>
  );
}
