import { errorResponse, successResponse } from "@/app/lib/api/response";
import { InvalidJsonRequestError, hasTrustedMutationOrigin, readBoundedJson } from "@/app/lib/api/request";
import { getSession } from "@/app/lib/auth/session";
import { WorkspaceNotFoundError, deleteEnvBundle, replaceEnvBundle } from "@/app/lib/workspace/service";
import { replaceEnvBundleSchema, workspaceIdSchema } from "@/app/lib/workspace/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAXIMUM_BODY_BYTES = 180_224;
const ownerId = async () => (await getSession())?.user.id ?? null;

async function routeId(context: RouteContext<"/api/env-bundles/[id]">) {
  const parsed = workspaceIdSchema.safeParse((await context.params).id);
  return parsed.success ? parsed.data : null;
}

export async function PATCH(request: Request, context: RouteContext<"/api/env-bundles/[id]">) {
  const owner = await ownerId();
  if (!owner) return errorResponse("Authentication required.", 401);
  if (!hasTrustedMutationOrigin(request)) return errorResponse("Request origin is not allowed.", 403);
  const id = await routeId(context);
  if (!id) return errorResponse("Environment bundle was not found.", 404);
  try {
    const parsed = replaceEnvBundleSchema.safeParse(await readBoundedJson(request, MAXIMUM_BODY_BYTES));
    if (!parsed.success) return errorResponse("Environment bundle update is invalid.", 400);
    return successResponse(await replaceEnvBundle(owner, id, parsed.data));
  } catch (error) {
    if (error instanceof InvalidJsonRequestError) return errorResponse("Environment bundle update is invalid.", 400);
    if (error instanceof WorkspaceNotFoundError) return errorResponse("Environment bundle was not found.", 404);
    return errorResponse("Environment bundle could not be updated.", 500);
  }
}

export async function DELETE(request: Request, context: RouteContext<"/api/env-bundles/[id]">) {
  const owner = await ownerId();
  if (!owner) return errorResponse("Authentication required.", 401);
  if (!hasTrustedMutationOrigin(request)) return errorResponse("Request origin is not allowed.", 403);
  const id = await routeId(context);
  if (!id) return errorResponse("Environment bundle was not found.", 404);
  try {
    await deleteEnvBundle(owner, id);
    return successResponse({ id });
  } catch (error) {
    if (error instanceof WorkspaceNotFoundError) return errorResponse("Environment bundle was not found.", 404);
    return errorResponse("Environment bundle could not be deleted.", 500);
  }
}
