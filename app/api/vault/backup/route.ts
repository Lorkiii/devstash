import { errorResponse, successResponse } from "@/app/lib/api/response";
import {
  InvalidJsonRequestError,
  hasTrustedMutationOrigin,
  readBoundedJson,
} from "@/app/lib/api/request";
import {
  VAULT_BACKUP_RATE_LIMIT_ACTIONS,
  allowVaultBackupRequest,
  vaultBackupRateLimitResponse,
} from "@/app/lib/api/rate-limit";
import { getSession } from "@/app/lib/auth/session";
import {
  VaultBackupConflictError,
  VaultBackupNotFoundError,
  findVaultBackupSnapshot,
  restoreVaultBackup,
} from "@/app/lib/vault-backup/service";
import { restoreVaultBackupSchema } from "@/app/lib/vault-backup/validation";
import { MAXIMUM_VAULT_BACKUP_BYTES } from "@/app/lib/vault-backup.types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ownerId = async () => (await getSession())?.user.id ?? null;

export async function GET() {
  const owner = await ownerId();
  if (!owner) return errorResponse("Authentication required.", 401);
  try {
    if (!await allowVaultBackupRequest(owner, VAULT_BACKUP_RATE_LIMIT_ACTIONS.export)) {
      return vaultBackupRateLimitResponse(VAULT_BACKUP_RATE_LIMIT_ACTIONS.export);
    }
    return successResponse(await findVaultBackupSnapshot(owner));
  } catch (error) {
    if (error instanceof VaultBackupNotFoundError) {
      return errorResponse("Vault profile was not found.", 404);
    }
    return errorResponse("Encrypted backup data is unavailable.", 500);
  }
}

export async function PUT(request: Request) {
  const owner = await ownerId();
  if (!owner) return errorResponse("Authentication required.", 401);
  if (!hasTrustedMutationOrigin(request)) {
    return errorResponse("Request origin is not allowed.", 403);
  }
  try {
    if (!await allowVaultBackupRequest(owner, VAULT_BACKUP_RATE_LIMIT_ACTIONS.restore)) {
      return vaultBackupRateLimitResponse(VAULT_BACKUP_RATE_LIMIT_ACTIONS.restore);
    }
    const parsed = restoreVaultBackupSchema.safeParse(
      await readBoundedJson(request, MAXIMUM_VAULT_BACKUP_BYTES),
    );
    if (!parsed.success) return errorResponse("Encrypted backup is invalid.", 400);
    return successResponse(await restoreVaultBackup(
      owner,
      parsed.data.backup,
      parsed.data.expectedProfile,
    ));
  } catch (error) {
    if (error instanceof InvalidJsonRequestError) {
      return errorResponse("Encrypted backup is invalid.", 400);
    }
    if (error instanceof VaultBackupConflictError) {
      return errorResponse("Vault changed during restore. No partial restore was kept.", 409);
    }
    return errorResponse("Encrypted backup could not be restored.", 500);
  }
}
