"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, X } from "lucide-react";
import { NAV_ITEMS, isNavItemActive } from "../nav-items";

interface AppSidebarProps {
  isUnlocked: boolean;
  onLock: () => void;
  /** Mobile drawer state; ignored on md and up where the rail is always shown. */
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function AppSidebar({ isUnlocked, onLock, isMobileOpen, onCloseMobile }: AppSidebarProps) {
  const pathname = usePathname();
  const workspaceItems = NAV_ITEMS.filter((item) => item.group === "workspace");
  const toolItems = NAV_ITEMS.filter((item) => item.group === "tools");

  const renderItem = (item: (typeof NAV_ITEMS)[number]) => {
    const active = isNavItemActive(pathname, item.href);
    const Icon = item.icon;
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onCloseMobile}
          aria-current={active ? "page" : undefined}
          aria-disabled={!isUnlocked}
          className={`group relative flex items-center gap-3 rounded px-3 py-2 font-mono text-xs tracking-wider transition-colors ${
            active
              ? "bg-[#6ea8ff]/10 text-[#e8eefb]"
              : "text-[#e8eefb]/60 hover:text-[#e8eefb] hover:bg-[#6ea8ff]/5"
          } ${isUnlocked ? "" : "opacity-50"}`}
        >
          <span
            className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full ${
              active ? "bg-[#6ea8ff]" : "bg-transparent"
            }`}
          />
          <Icon className={`w-4 h-4 shrink-0 ${active ? "text-[#6ea8ff]" : ""}`} />
          <span className="uppercase lg:inline md:hidden">{item.label}</span>
        </Link>
      </li>
    );
  };

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 h-14 border-b border-[#6ea8ff]/15 md:hidden">
        <span className="font-mono text-[10px] tracking-widest text-[#6ea8ff]">NAVIGATION</span>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="p-1.5 rounded text-[#e8eefb]/70 hover:text-[#e8eefb] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">{workspaceItems.map(renderItem)}</ul>
        <div className="my-3 mx-3 border-t border-[#6ea8ff]/15" />
        <ul className="space-y-0.5">{toolItems.map(renderItem)}</ul>
      </nav>

      <div className="p-2 border-t border-[#6ea8ff]/15">
        <button
          type="button"
          onClick={onLock}
          disabled={!isUnlocked}
          className="w-full flex items-center justify-center gap-2 rounded border border-amber-400/40 bg-amber-400/10 px-3 py-2 font-mono text-xs font-semibold tracking-wider text-amber-300 hover:bg-amber-400/20 hover:border-amber-400/70 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="lg:inline md:hidden">LOCK</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop / tablet rail */}
      <aside className="hidden md:flex md:w-16 lg:w-56 shrink-0 flex-col border-r border-[#6ea8ff]/15 bg-[#05070d]/70 backdrop-blur-md">
        {content}
      </aside>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onCloseMobile}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default"
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-[#6ea8ff]/25 bg-[#05070d] shadow-[0_0_40px_rgba(0,0,0,0.7)] animate-fadeIn">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
