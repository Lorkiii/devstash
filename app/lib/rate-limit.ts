import "server-only";

export interface RateLimitPolicy {
  maxAttempts: number;
  windowMs: number;
}

export interface RateLimitRepository {
  resetExpiredWindow(key: string, expiredBefore: Date, now: Date): Promise<boolean>;
  incrementActiveWindow(key: string, expiredBefore: Date, maximum: number): Promise<boolean>;
  createWindow(key: string, now: Date): Promise<boolean>;
}

export async function allowRateLimitedRequest(
  repository: RateLimitRepository,
  key: string,
  policy: RateLimitPolicy,
  now = new Date(),
): Promise<boolean> {
  const expiredBefore = new Date(now.valueOf() - policy.windowMs);

  if (await repository.resetExpiredWindow(key, expiredBefore, now)) return true;
  if (await repository.incrementActiveWindow(key, expiredBefore, policy.maxAttempts)) return true;
  if (await repository.createWindow(key, now)) return true;

  // Another request may have created the window between the first write and create.
  return repository.incrementActiveWindow(key, expiredBefore, policy.maxAttempts);
}
