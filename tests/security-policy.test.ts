import assert from "node:assert/strict";
import test from "node:test";
import {
  buildContentSecurityPolicy,
  contentSecurityPolicyHeaderName,
  contentSecurityPolicyMode,
} from "../app/lib/security/content-security-policy";

const nonce = "MDEyMzQ1Njc4OWFiY2RlZg==";

function directive(policy: string, name: string): string {
  return policy.split("; ").find((value) => value.startsWith(`${name} `)) ?? "";
}

test("production CSP is nonce based, self hosted, and denies inline styles and embedding", () => {
  const policy = buildContentSecurityPolicy(nonce, false);
  const script = directive(policy, "script-src");
  assert.match(script, new RegExp(`'nonce-${nonce}'`));
  assert.match(script, /'strict-dynamic'/u);
  assert.match(script, /'wasm-unsafe-eval'/u);
  assert.doesNotMatch(script, /(?:^|\s)'unsafe-eval'(?:\s|$)/u);
  assert.equal(directive(policy, "style-src-attr"), "style-src-attr 'none'");
  assert.equal(directive(policy, "worker-src"), "worker-src 'self'");
  assert.equal(directive(policy, "connect-src"), "connect-src 'self'");
  assert.equal(directive(policy, "object-src"), "object-src 'none'");
  assert.equal(directive(policy, "frame-ancestors"), "frame-ancestors 'none'");
  assert.equal(directive(policy, "base-uri"), "base-uri 'none'");
  assert.match(policy, /upgrade-insecure-requests/u);
  assert.doesNotMatch(policy, /'unsafe-inline'/u);
});

test("development CSP permits only the exceptions required by the Next.js toolchain", () => {
  const policy = buildContentSecurityPolicy(nonce, true);
  assert.match(directive(policy, "script-src"), /(?:^|\s)'unsafe-eval'(?:\s|$)/u);
  assert.equal(directive(policy, "style-src-attr"), "style-src-attr 'unsafe-inline'");
  assert.doesNotMatch(policy, /upgrade-insecure-requests/u);
});

test("CSP mode stays report-only unless enforcement is explicitly configured", () => {
  assert.equal(contentSecurityPolicyMode(undefined), "report-only");
  assert.equal(contentSecurityPolicyMode("report-only"), "report-only");
  assert.equal(contentSecurityPolicyMode("unexpected"), "report-only");
  assert.equal(contentSecurityPolicyMode("enforce"), "enforce");
  assert.equal(contentSecurityPolicyHeaderName("report-only"), "Content-Security-Policy-Report-Only");
  assert.equal(contentSecurityPolicyHeaderName("enforce"), "Content-Security-Policy");
  assert.throws(() => buildContentSecurityPolicy("bad\r\nheader", false), /Invalid CSP nonce/u);
});
