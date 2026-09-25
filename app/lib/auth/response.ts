import "server-only";
import { AUTH_RESPONSE_POLICY } from "./config";

const BODYLESS_RESPONSE_STATUSES = new Set([204, 205, 304]);

export function applyPrivateAuthHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", AUTH_RESPONSE_POLICY.cacheControl);
  headers.set("Referrer-Policy", AUTH_RESPONSE_POLICY.referrerPolicy);

  // Auth.js uses immutable redirect responses for callback failures. Rebuild
  // every response so security headers never replace its safe redirect path.
  return new Response(
    BODYLESS_RESPONSE_STATUSES.has(response.status) ? null : response.body,
    {
      status: response.status,
      statusText: response.statusText,
      headers,
    },
  );
}
