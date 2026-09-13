import { errorResponse, successResponse } from "@/app/lib/api/response";
import { InvalidJsonRequestError, hasTrustedMutationOrigin, readBoundedJson } from "@/app/lib/api/request";
import { getSession } from "@/app/lib/auth/session";
import { WorkspaceConflictError, WorkspaceNotFoundError, createEnvBundle, findEnvBundles } from "@/app/lib/workspace/service";
import { createEnvBundleSchema } from "@/app/lib/workspace/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAXIMUM_BODY_BYTES = 180_224;
const ownerId = async () => (await getSession())?.user.id ?? null;

export async function GET() {
  const owner = await ownerId();
  if (!owner) return errorResponse("Authentication required.", 401);
  try {
    return successResponse(await findEnvBundles(owner));
  } catch {
    return errorResponse("Environment bundles are unavailable.", 500);
  }
}

export async function POST(request: Request) {
  const owner = await ownerId();
  if (!owner) return errorResponse("Authentication required.", 401);
  if (!hasTrustedMutationOrigin(request)) return errorResponse("Request origin is not allowed.", 403);
  try {
    const parsed = createEnvBundleSchema.safeParse(await readBoundedJson(request, MAXIMUM_BODY_BYTES));
    if (!parsed.success) return errorResponse("Environment bundle is invalid.", 400);
    return successResponse(await createEnvBundle(owner, parsed.data), 201);
  } catch (error) {
    if (error instanceof InvalidJsonRequestError) return errorResponse("Environment bundle is invalid.", 400);
    if (error instanceof WorkspaceNotFoundError) return errorResponse("Project was not found.", 404);
    if (error instanceof WorkspaceConflictError) return errorResponse("Environment bundle already exists.", 409);
    return errorResponse("Environment bundle could not be created.", 500);
  }
}
