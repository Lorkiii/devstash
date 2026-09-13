import { errorResponse, successResponse } from "@/app/lib/api/response";
import { InvalidJsonRequestError, hasTrustedMutationOrigin, readBoundedJson } from "@/app/lib/api/request";
import { getSession } from "@/app/lib/auth/session";
import {
  WorkspaceConflictError,
  WorkspaceNotFoundError,
  deleteTaskCategory,
  replaceTaskCategory,
} from "@/app/lib/workspace/service";
import {
  replaceTaskCategorySchema,
  workspaceIdSchema,
} from "@/app/lib/workspace/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAXIMUM_BODY_BYTES = 8_192;
const ownerId = async () => (await getSession())?.user.id ?? null;

async function routeId(context: RouteContext<"/api/task-categories/[id]">) {
  const parsed = workspaceIdSchema.safeParse((await context.params).id);
  return parsed.success ? parsed.data : null;
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/task-categories/[id]">,
) {
  const owner = await ownerId();
  if (!owner) return errorResponse("Authentication required.", 401);
  if (!hasTrustedMutationOrigin(request)) return errorResponse("Request origin is not allowed.", 403);
  const id = await routeId(context);
  if (!id) return errorResponse("Task category was not found.", 404);
  try {
    const parsed = replaceTaskCategorySchema.safeParse(
      await readBoundedJson(request, MAXIMUM_BODY_BYTES),
    );
    if (!parsed.success) return errorResponse("Task category update is invalid.", 400);
    return successResponse(await replaceTaskCategory(owner, id, parsed.data));
  } catch (error) {
    if (error instanceof InvalidJsonRequestError) {
      return errorResponse("Task category update is invalid.", 400);
    }
    if (error instanceof WorkspaceNotFoundError) {
      return errorResponse("Task category was not found.", 404);
    }
    return errorResponse("Task category could not be updated.", 500);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/task-categories/[id]">,
) {
  const owner = await ownerId();
  if (!owner) return errorResponse("Authentication required.", 401);
  if (!hasTrustedMutationOrigin(request)) return errorResponse("Request origin is not allowed.", 403);
  const id = await routeId(context);
  if (!id) return errorResponse("Task category was not found.", 404);
  try {
    await deleteTaskCategory(owner, id);
    return successResponse({ id });
  } catch (error) {
    if (error instanceof WorkspaceNotFoundError) {
      return errorResponse("Task category was not found.", 404);
    }
    if (error instanceof WorkspaceConflictError) {
      return errorResponse("Task category still has linked tasks.", 409);
    }
    return errorResponse("Task category could not be deleted.", 500);
  }
}
