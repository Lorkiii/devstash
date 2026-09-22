import { UserRound } from "lucide-react";

export function accountInitials(displayName: string | null): string | null {
  if (!displayName) return null;
  const words = displayName.trim().split(/ +/u).filter(Boolean);
  if (words.length === 0) return null;
  const first = Array.from(words[0])[0] ?? "";
  const last = words.length > 1 ? Array.from(words.at(-1) ?? "")[0] ?? "" : "";
  return `${first}${last}`.toLocaleUpperCase();
}

export function AccountAvatar({ displayName, size = "small" }: {
  displayName: string | null;
  size?: "small" | "large";
}) {
  const initials = accountInitials(displayName);
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-accent/45 bg-accent/15 font-mono font-bold tracking-wide text-accent-strong ${size === "large" ? "size-11 text-base sm:size-14 sm:text-lg" : "size-8 text-[11px] sm:size-9 sm:text-xs"}`}
    >
      {initials ?? <UserRound className={size === "large" ? "size-5 sm:size-6" : "size-4"} />}
    </span>
  );
}
