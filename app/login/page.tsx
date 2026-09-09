import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginPageContent } from "@/app/components/auth/login-page";
import { AUTH_ROUTES } from "@/app/lib/auth/config";
import { getAuthEnvironment } from "@/app/lib/auth/environment";
import { getSession } from "@/app/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Sign in — DevStash",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getSession()) redirect(AUTH_ROUTES.authenticatedHome);

  const { error } = await searchParams;
  return (
    <LoginPageContent
      error={error}
      isConfigured={Boolean(getAuthEnvironment())}
    />
  );
}
