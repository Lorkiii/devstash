export type ContentSecurityPolicyMode = "report-only" | "enforce";

const CSP_NONCE_PATTERN = /^[A-Za-z0-9+/_=-]+$/u;

export function contentSecurityPolicyMode(value: string | undefined): ContentSecurityPolicyMode {
  return value === "enforce" ? "enforce" : "report-only";
}

export function contentSecurityPolicyHeaderName(mode: ContentSecurityPolicyMode): string {
  return mode === "enforce"
    ? "Content-Security-Policy"
    : "Content-Security-Policy-Report-Only";
}

export function buildContentSecurityPolicy(nonce: string, isDevelopment: boolean): string {
  if (!CSP_NONCE_PATTERN.test(nonce)) throw new Error("Invalid CSP nonce.");

  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "'wasm-unsafe-eval'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
  ];
  const styleSources = isDevelopment
    ? ["'self'", "'unsafe-inline'"]
    : ["'self'", `'nonce-${nonce}'`];

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    `style-src ${styleSources.join(" ")}`,
    `style-src-attr ${isDevelopment ? "'unsafe-inline'" : "'none'"}`,
    "worker-src 'self'",
    "connect-src 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "media-src 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "manifest-src 'self'",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
