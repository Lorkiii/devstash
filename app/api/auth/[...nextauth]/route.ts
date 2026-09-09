import { handleAuthRequest } from "@/app/lib/auth/route-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export { handleAuthRequest as GET, handleAuthRequest as POST };
