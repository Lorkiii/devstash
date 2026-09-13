import { errorResponse, successResponse } from "@/app/lib/api/response";
import {
  InvalidJsonRequestError,
  hasTrustedMutationOrigin,
  readBoundedJson,
} from "@/app/lib/api/request";
import { getSession } from "@/app/lib/auth/session";
import {
  WorkspaceConflictError,
  createProject,
  findProjects,
} from "@/app/lib/workspace/service";
import { createProjectSchema } from "@/app/lib/workspace/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAXIMUM_BODY_BYTES = 32_768;
const ownerId = async () => (await getSession())?.user.id ?? null;

export async function GET() {
  const owner = await ownerId();
  if (!owner) return errorResponse("Authentication required.", 401);
  try {
    return successResponse(await findProjects(owner));
  } catch {
    return errorResponse("Projects are unavailable.", 500);
  }
}

export async function POST(request: Request) {
  const owner = await ownerId();
  if (!owner) return errorResponse("Authentication required.", 401);
  if (!hasTrustedMutationOrigin(request))
    return errorResponse("Request origin is not allowed.", 403);
  try {
    const parsed = createProjectSchema.safeParse(
      await readBoundedJson(request, MAXIMUM_BODY_BYTES),
    );
    if (!parsed.success) return errorResponse("Project is invalid.", 400);
    return successResponse(await createProject(owner, parsed.data), 201);
  } catch (error) {
    if (error instanceof InvalidJsonRequestError)
      return errorResponse("Project is invalid.", 400);
    if (error instanceof WorkspaceConflictError)
      return errorResponse("Project already exists.", 409);
    return errorResponse("Project could not be created.", 500);
  }
}
