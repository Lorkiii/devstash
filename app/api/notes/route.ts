import { errorResponse, successResponse } from "@/app/lib/api/response";
import { InvalidJsonRequestError, hasTrustedMutationOrigin, readBoundedJson } from "@/app/lib/api/request";
import { getSession } from "@/app/lib/auth/session";
import { WorkspaceConflictError, WorkspaceNotFoundError, createNote, findNotes } from "@/app/lib/workspace/service";
import { createNoteSchema } from "@/app/lib/workspace/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAXIMUM_BODY_BYTES = 180_224;
const ownerId = async () => (await getSession())?.user.id ?? null;

export async function GET() {
  const owner = await ownerId();
  if (!owner) return errorResponse("Authentication required.", 401);
  try {
    return successResponse(await findNotes(owner));
  } catch {
    return errorResponse("Notes are unavailable.", 500);
  }
}

export async function POST(request: Request) {
  const owner = await ownerId();
  if (!owner) return errorResponse("Authentication required.", 401);
  if (!hasTrustedMutationOrigin(request)) return errorResponse("Request origin is not allowed.", 403);
  try {
    const parsed = createNoteSchema.safeParse(await readBoundedJson(request, MAXIMUM_BODY_BYTES));
    if (!parsed.success) return errorResponse("Note is invalid.", 400);
    return successResponse(await createNote(owner, parsed.data), 201);
  } catch (error) {
    if (error instanceof InvalidJsonRequestError) return errorResponse("Note is invalid.", 400);
    if (error instanceof WorkspaceNotFoundError) return errorResponse("Project was not found.", 404);
    if (error instanceof WorkspaceConflictError) return errorResponse("Note already exists.", 409);
    return errorResponse("Note could not be created.", 500);
  }
}
