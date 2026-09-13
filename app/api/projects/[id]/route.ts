import { errorResponse, successResponse } from "@/app/lib/api/response";
import {
  InvalidJsonRequestError,
  hasTrustedMutationOrigin,
  readBoundedJson,
} from "@/app/lib/api/request";
import { getSession } from "@/app/lib/auth/session";
import {
  WorkspaceConflictError,
  WorkspaceNotFoundError,
  deleteProject,
  replaceProject,
} from "@/app/lib/workspace/service";
import {
  replaceProjectSchema,
  workspaceIdSchema,
} from "@/app/lib/workspace/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAXIMUM_BODY_BYTES = 32_768;
const ownerId = async () => (await getSession())?.user.id ?? null;

async function routeId(context: RouteContext<"/api/projects/[id]">) {
  const parsed = workspaceIdSchema.safeParse((await context.params).id);
  return parsed.success ? parsed.data : null;
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/projects/[id]">,
) {
  const owner = await ownerId();
  if (!owner) return errorResponse("Authentication required.", 401);
  if (!hasTrustedMutationOrigin(request))
    return errorResponse("Request origin is not allowed.", 403);
  const id = await routeId(context);
  if (!id) return errorResponse("Project was not found.", 404);
  try {
    const parsed = replaceProjectSchema.safeParse(
      await readBoundedJson(request, MAXIMUM_BODY_BYTES),
    );
    if (!parsed.success)
      return errorResponse("Project update is invalid.", 400);
    return successResponse(await replaceProject(owner, id, parsed.data));
  } catch (error) {
    if (error instanceof InvalidJsonRequestError)
      return errorResponse("Project update is invalid.", 400);
    if (error instanceof WorkspaceNotFoundError)
      return errorResponse("Project was not found.", 404);
    return errorResponse("Project could not be updated.", 500);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/projects/[id]">,
) {
  const owner = await ownerId();
  if (!owner) return errorResponse("Authentication required.", 401);
  if (!hasTrustedMutationOrigin(request))
    return errorResponse("Request origin is not allowed.", 403);
  const id = await routeId(context);
  if (!id) return errorResponse("Project was not found.", 404);
  try {
    await deleteProject(owner, id);
    return successResponse({ id });
  } catch (error) {
    if (error instanceof WorkspaceNotFoundError)
      return errorResponse("Project was not found.", 404);
    if (error instanceof WorkspaceConflictError) {
      return errorResponse("Project still has linked workspace records.", 409);
    }
    return errorResponse("Project could not be deleted.", 500);
  }
}
