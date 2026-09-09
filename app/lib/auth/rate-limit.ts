import "server-only";
import {
  AUTH_ACTIONS,
  AUTH_RATE_LIMIT_POLICIES,
  AUTH_ROUTES,
  type RateLimitedAuthAction,
} from "./config";
import type { AuthRateLimitRepository } from "./rate-limit-repository";

export function getRateLimitedAuthAction(pathname: string): RateLimitedAuthAction | null {
  const action = pathname.startsWith(`${AUTH_ROUTES.api}/`)
    ? pathname.slice(AUTH_ROUTES.api.length + 1).split("/", 1)[0]
    : null;

  return action === AUTH_ACTIONS.signIn || action === AUTH_ACTIONS.callback
    ? action
    : null;
}

export async function allowAuthAttempt(
  repository: AuthRateLimitRepository,
  action: RateLimitedAuthAction,
  now = new Date(),
) {
  const policy = AUTH_RATE_LIMIT_POLICIES[action];
  const expiredBefore = new Date(now.valueOf() - policy.windowMs);

  if (await repository.resetExpiredWindow(action, expiredBefore, now)) return true;
  if (await repository.incrementActiveWindow(action, expiredBefore, policy.maxAttempts)) return true;
  if (await repository.createWindow(action, now)) return true;

  // Another request may have created the window between the first write and create.
  return repository.incrementActiveWindow(action, expiredBefore, policy.maxAttempts);
}
