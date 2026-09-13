import { errorResponse, successResponse } from "@/app/lib/api/response";
import {
  InvalidJsonRequestError,
  hasTrustedMutationOrigin,
  readBoundedJson,
} from "@/app/lib/api/request";
import { getSession } from "@/app/lib/auth/session";
import {
  VaultItemNotFoundError,
  deleteVaultItem,
  replaceVaultItem,
} from "@/app/lib/vault-items/service";
import {
  replaceVaultItemSchema,
  vaultItemIdSchema,
} from "@/app/lib/vault-items/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAXIMUM_ITEM_BODY_BYTES = 49_152;

async function authenticatedOwnerId() {
  return (await getSession())?.user.id ?? null;
}

async function routeItemId(context: RouteContext<"/api/vault/items/[id]">) {
  const parsed = vaultItemIdSchema.safeParse((await context.params).id);
  return parsed.success ? parsed.data : null;
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/vault/items/[id]">,
) {
  const ownerId = await authenticatedOwnerId();
  if (!ownerId) return errorResponse("Authentication required.", 401);
  if (!hasTrustedMutationOrigin(request)) {
    return errorResponse("Request origin is not allowed.", 403);
  }
  const id = await routeItemId(context);
  if (!id) return errorResponse("Vault item was not found.", 404);

  try {
    const parsed = replaceVaultItemSchema.safeParse(
      await readBoundedJson(request, MAXIMUM_ITEM_BODY_BYTES),
    );
    if (!parsed.success) return errorResponse("Vault item update is invalid.", 400);
    return successResponse(await replaceVaultItem(ownerId, id, parsed.data));
  } catch (error) {
    if (error instanceof InvalidJsonRequestError) {
      return errorResponse("Vault item update is invalid.", 400);
    }
    if (error instanceof VaultItemNotFoundError) {
      return errorResponse("Vault item was not found.", 404);
    }
    return errorResponse("Vault item could not be updated.", 500);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/vault/items/[id]">,
) {
  const ownerId = await authenticatedOwnerId();
  if (!ownerId) return errorResponse("Authentication required.", 401);
  if (!hasTrustedMutationOrigin(request)) {
    return errorResponse("Request origin is not allowed.", 403);
  }
  const id = await routeItemId(context);
  if (!id) return errorResponse("Vault item was not found.", 404);

  try {
    await deleteVaultItem(ownerId, id);
    return successResponse({ id });
  } catch (error) {
    if (error instanceof VaultItemNotFoundError) {
      return errorResponse("Vault item was not found.", 404);
    }
    return errorResponse("Vault item could not be deleted.", 500);
  }
}
