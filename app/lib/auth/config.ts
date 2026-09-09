export const AUTH_PROVIDER_ID = "google";
export const AUTH_PROVIDER_ACCOUNT_TYPE = "oidc";

export const AUTH_ROUTES = {
  api: "/api/auth",
  publicHome: "/",
  login: "/login",
  authenticatedHome: "/dashboard",
} as const;

export const AUTH_ACTIONS = {
  signIn: "signin",
  callback: "callback",
  signOut: "signout",
} as const;

export const AUTH_ERROR_CODES = {
  accessDenied: "AccessDenied",
} as const;

export type RateLimitedAuthAction =
  (typeof AUTH_ACTIONS)["signIn" | "callback"];

export const AUTH_RATE_LIMIT_POLICIES: Record<
  RateLimitedAuthAction,
  { maxAttempts: number; windowMs: number }
> = {
  [AUTH_ACTIONS.signIn]: { maxAttempts: 20, windowMs: 60_000 },
  [AUTH_ACTIONS.callback]: { maxAttempts: 60, windowMs: 60_000 },
};

export const AUTH_SESSION_POLICY = {
  maxAgeSeconds: 24 * 60 * 60,
  updateAgeSeconds: 60 * 60,
  clientRefreshSeconds: 60,
} as const;

export const AUTH_RESPONSE_POLICY = {
  cacheControl: "private, no-store, max-age=0",
  referrerPolicy: "no-referrer",
  retryAfterSeconds: 60,
  unavailableMessage: "Authentication is unavailable. Please try again later.",
  status: {
    forbidden: 403,
    tooManyRequests: 429,
    unavailable: 503,
  },
} as const;
