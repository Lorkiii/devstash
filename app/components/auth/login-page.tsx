import Link from "next/link";
import { AUTH_ERROR_CODES, AUTH_ROUTES } from "@/app/lib/auth/config";
import { AuthTerminalPanel } from "./auth-terminal-panel";
import type { LoginPageContentProps } from "./login-page.types";

export function LoginPageContent({ error, isConfigured }: LoginPageContentProps) {
  // Only fixed public messages are rendered; query values are never echoed.
  let errorMessage: string | undefined;
  if (error) {
    errorMessage = error === AUTH_ERROR_CODES.accessDenied
      ? "DevStash requires a verified Gmail account. Choose another Google account."
      : "Google sign-in could not be completed. Please try again.";
  }
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 bg-[#05070d] px-4 py-8 text-[#e8eefb]">
      <h1 className="font-mono text-xl font-bold tracking-widest">Sign in to DevStash</h1>
      <div className="w-full max-w-md">
        <AuthTerminalPanel
          isConfigured={isConfigured}
          errorMessage={errorMessage}
        />
      </div>
      <Link
        href={AUTH_ROUTES.publicHome}
        className="font-mono text-sm text-[#6ea8ff] hover:underline"
      >
        Back to DevStash
      </Link>
    </main>
  );
}
