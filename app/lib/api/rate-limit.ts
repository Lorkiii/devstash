import "server-only";

import { getAuthEnvironment } from "../auth/environment";
import { getPrisma } from "../prisma";
import { allowRateLimitedRequest, type RateLimitPolicy } from "../rate-limit";
import { createRateLimitRepository } from "../rate-limit-repository";
import { errorResponse } from "./response";

export const VAULT_BACKUP_RATE_LIMIT_ACTIONS = {
  export: "vault-backup-export",
  restore: "vault-backup-restore",
} as const;

export type VaultBackupRateLimitAction =
  (typeof VAULT_BACKUP_RATE_LIMIT_ACTIONS)[keyof typeof VAULT_BACKUP_RATE_LIMIT_ACTIONS];

export const VAULT_BACKUP_RATE_LIMIT_POLICIES: Record<
  VaultBackupRateLimitAction,
  RateLimitPolicy
> = {
  [VAULT_BACKUP_RATE_LIMIT_ACTIONS.export]: { maxAttempts: 12, windowMs: 60 * 60_000 },
  [VAULT_BACKUP_RATE_LIMIT_ACTIONS.restore]: { maxAttempts: 5, windowMs: 60 * 60_000 },
};

export function vaultBackupRateLimitKey(
  ownerId: string,
  action: VaultBackupRateLimitAction,
): string {
  return `private:${action}:${ownerId}`;
}

export async function allowVaultBackupRequest(
  ownerId: string,
  action: VaultBackupRateLimitAction,
): Promise<boolean> {
  const environment = getAuthEnvironment();
  if (!environment) throw new Error("Application configuration is unavailable.");
  return allowRateLimitedRequest(
    createRateLimitRepository(getPrisma(environment.databaseUrl)),
    vaultBackupRateLimitKey(ownerId, action),
    VAULT_BACKUP_RATE_LIMIT_POLICIES[action],
  );
}

export function vaultBackupRateLimitResponse(action: VaultBackupRateLimitAction) {
  const response = errorResponse("Too many encrypted backup requests. Try again later.", 429);
  response.headers.set(
    "Retry-After",
    String(Math.ceil(VAULT_BACKUP_RATE_LIMIT_POLICIES[action].windowMs / 1_000)),
  );
  return response;
}
