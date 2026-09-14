import "server-only";
import {
  AUTH_ACTIONS,
  AUTH_RATE_LIMIT_POLICIES,
  AUTH_ROUTES,
  type RateLimitedAuthAction,
} from "./config";
import { allowRateLimitedRequest, type RateLimitRepository } from "../rate-limit";

export function getRateLimitedAuthAction(pathname: string): RateLimitedAuthAction | null {
  const action = pathname.startsWith(`${AUTH_ROUTES.api}/`)
    ? pathname.slice(AUTH_ROUTES.api.length + 1).split("/", 1)[0]
    : null;

  return action === AUTH_ACTIONS.signIn || action === AUTH_ACTIONS.callback
    ? action
    : null;
}

export async function allowAuthAttempt(
  repository: RateLimitRepository,
  action: RateLimitedAuthAction,
  now = new Date(),
) {
  return allowRateLimitedRequest(repository, action, AUTH_RATE_LIMIT_POLICIES[action], now);
}
