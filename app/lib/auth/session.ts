import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";
import { getAuthEnvironment } from "./environment";
import { AUTH_ROUTES } from "./config";

// React cache deduplicates within a render; it does not persist sessions across requests.
export const getSession = cache(async () => {
  if (!getAuthEnvironment()) return null;
  try {
    const session = await auth();
    return session?.user?.id ? { user: { id: session.user.id }, expires: session.expires } : null;
  } catch {
    return null;
  }
});

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect(AUTH_ROUTES.login);
  return session;
}
