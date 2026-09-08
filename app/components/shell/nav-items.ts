import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  KeyRound,
  FolderKanban,
  NotebookPen,
  ListChecks,
  Dices,
  Settings,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Items in the "tools" group render below a divider. */
  group: "workspace" | "tools";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "workspace" },
  { href: "/vault", label: "Vault", icon: KeyRound, group: "workspace" },
  { href: "/projects", label: "Projects", icon: FolderKanban, group: "workspace" },
  { href: "/notes", label: "Notes", icon: NotebookPen, group: "workspace" },
  { href: "/tasks", label: "Tasks", icon: ListChecks, group: "workspace" },
  { href: "/generator", label: "Generator", icon: Dices, group: "tools" },
  { href: "/settings", label: "Settings", icon: Settings, group: "tools" },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
