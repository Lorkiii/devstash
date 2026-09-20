import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  buildContentSecurityPolicy,
  contentSecurityPolicyHeaderName,
  contentSecurityPolicyMode,
} from "./app/lib/security/content-security-policy";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
  const policy = buildContentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
  const mode = contentSecurityPolicyMode(process.env.DEVSTASH_CSP_MODE);
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("Content-Security-Policy", policy);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(contentSecurityPolicyHeaderName(mode), policy);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
