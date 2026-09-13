import { errorResponse, successResponse } from "@/app/lib/api/response";
import { InvalidJsonRequestError, hasTrustedMutationOrigin, readBoundedJson } from "@/app/lib/api/request";
import { getSession } from "@/app/lib/auth/session";
import {
  WorkspaceConflictError,
  createTaskCategory,
  findTaskCategories,
} from "@/app/lib/workspace/service";
import { createTaskCategorySchema } from "@/app/lib/workspace/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAXIMUM_BODY_BYTES = 8_192;
const ownerId = async () => (await getSession())?.user.id ?? null;

export async function GET() {
  const owner = await ownerId();
  if (!owner) return errorResponse("Authentication required.", 401);
  try {
    return successResponse(await findTaskCategories(owner));
  } catch {
    return errorResponse("Task categories are unavailable.", 500);
  }
}

export async function POST(request: Request) {
  const owner = await ownerId();
  if (!owner) return errorResponse("Authentication required.", 401);
  if (!hasTrustedMutationOrigin(request)) return errorResponse("Request origin is not allowed.", 403);
  try {
    const parsed = createTaskCategorySchema.safeParse(
      await readBoundedJson(request, MAXIMUM_BODY_BYTES),
    );
    if (!parsed.success) return errorResponse("Task category is invalid.", 400);
    return successResponse(await createTaskCategory(owner, parsed.data), 201);
  } catch (error) {
    if (error instanceof InvalidJsonRequestError) return errorResponse("Task category is invalid.", 400);
    if (error instanceof WorkspaceConflictError) return errorResponse("Task category already exists.", 409);
    return errorResponse("Task category could not be created.", 500);
  }
}
