import { errorResponse, successResponse } from "@/app/lib/api/response";
import {
  InvalidJsonRequestError,
  hasTrustedMutationOrigin,
  readBoundedJson,
} from "@/app/lib/api/request";
import { getSession } from "@/app/lib/auth/session";
import {
  VaultItemConflictError,
  VaultItemNotFoundError,
  createVaultItem,
  findVaultItems,
} from "@/app/lib/vault-items/service";
import { createVaultItemSchema } from "@/app/lib/vault-items/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAXIMUM_ITEM_BODY_BYTES = 49_152;

async function authenticatedOwnerId() {
  return (await getSession())?.user.id ?? null;
}

export async function GET() {
  const ownerId = await authenticatedOwnerId();
  if (!ownerId) return errorResponse("Authentication required.", 401);

  try {
    return successResponse(await findVaultItems(ownerId));
  } catch {
    return errorResponse("Vault items are unavailable.", 500);
  }
}

export async function POST(request: Request) {
  const ownerId = await authenticatedOwnerId();
  if (!ownerId) return errorResponse("Authentication required.", 401);
  if (!hasTrustedMutationOrigin(request)) {
    return errorResponse("Request origin is not allowed.", 403);
  }

  try {
    const parsed = createVaultItemSchema.safeParse(
      await readBoundedJson(request, MAXIMUM_ITEM_BODY_BYTES),
    );
    if (!parsed.success) return errorResponse("Vault item is invalid.", 400);
    return successResponse(await createVaultItem(ownerId, parsed.data), 201);
  } catch (error) {
    if (error instanceof InvalidJsonRequestError) {
      return errorResponse("Vault item is invalid.", 400);
    }
    if (error instanceof VaultItemConflictError) {
      return errorResponse("Vault item already exists.", 409);
    }
    if (error instanceof VaultItemNotFoundError) {
      return errorResponse("Project was not found.", 404);
    }
    return errorResponse("Vault item could not be created.", 500);
  }
}
