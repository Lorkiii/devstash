import { getSession } from "@/app/lib/auth/session";
import { errorResponse, successResponse } from "@/app/lib/api/response";
import {
  InvalidJsonRequestError,
  hasTrustedMutationOrigin,
  readBoundedJson,
} from "@/app/lib/api/request";
import {
  VaultProfileConflictError,
  createVaultProfile,
  findVaultProfile,
  updateVaultProfile,
} from "@/app/lib/vault-profile/service";
import {
  createVaultProfileSchema,
  updateVaultProfileSchema,
} from "@/app/lib/vault-profile/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAXIMUM_PROFILE_BODY_BYTES = 16_384;

async function authenticatedOwnerId() {
  return (await getSession())?.user.id ?? null;
}

export async function GET() {
  const ownerId = await authenticatedOwnerId();
  if (!ownerId) return errorResponse("Authentication required.", 401);

  try {
    return successResponse(await findVaultProfile(ownerId));
  } catch {
    return errorResponse("Vault profile is unavailable.", 500);
  }
}

export async function POST(request: Request) {
  const ownerId = await authenticatedOwnerId();
  if (!ownerId) return errorResponse("Authentication required.", 401);
  if (!hasTrustedMutationOrigin(request)) return errorResponse("Request origin is not allowed.", 403);

  try {
    const parsed = createVaultProfileSchema.safeParse(
      await readBoundedJson(request, MAXIMUM_PROFILE_BODY_BYTES),
    );
    if (!parsed.success) return errorResponse("Vault profile is invalid.", 400);
    return successResponse(await createVaultProfile(ownerId, parsed.data), 201);
  } catch (error) {
    if (error instanceof InvalidJsonRequestError) {
      return errorResponse("Vault profile is invalid.", 400);
    }
    if (error instanceof VaultProfileConflictError) {
      return errorResponse("A vault profile already exists.", 409);
    }
    return errorResponse("Vault profile could not be created.", 500);
  }
}

export async function PATCH(request: Request) {
  const ownerId = await authenticatedOwnerId();
  if (!ownerId) return errorResponse("Authentication required.", 401);
  if (!hasTrustedMutationOrigin(request)) return errorResponse("Request origin is not allowed.", 403);

  try {
    const parsed = updateVaultProfileSchema.safeParse(
      await readBoundedJson(request, MAXIMUM_PROFILE_BODY_BYTES),
    );
    if (!parsed.success) return errorResponse("Vault profile update is invalid.", 400);
    return successResponse(await updateVaultProfile(ownerId, parsed.data));
  } catch (error) {
    if (error instanceof InvalidJsonRequestError) {
      return errorResponse("Vault profile update is invalid.", 400);
    }
    if (error instanceof VaultProfileConflictError) {
      return errorResponse("Vault profile changed. Lock and try again.", 409);
    }
    return errorResponse("Vault profile could not be updated.", 500);
  }
}
