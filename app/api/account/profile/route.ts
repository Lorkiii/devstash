import { errorResponse, successResponse } from "@/app/lib/api/response";
import { InvalidJsonRequestError, hasTrustedMutationOrigin, readBoundedJson } from "@/app/lib/api/request";
import { accountProfileUpdateSchema } from "@/app/lib/account-profile";
import { getAccountProfile, updateAccountProfile } from "@/app/lib/account-profile-service";
import { getAuthEnvironment } from "@/app/lib/auth/environment";
import { getSession } from "@/app/lib/auth/session";
import { getPrisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAXIMUM_BODY_BYTES = 256;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return errorResponse("Authentication required.", 401);
  if (new URL(request.url).search) return errorResponse("Profile request is invalid.", 400);

  try {
    const environment = getAuthEnvironment();
    if (!environment) return errorResponse("Account profile is unavailable.", 500);
    const profile = await getAccountProfile(getPrisma(environment.databaseUrl), session.user.id);
    return profile
      ? successResponse(profile)
      : errorResponse("Account profile was not found.", 404);
  } catch {
    return errorResponse("Account profile is unavailable.", 500);
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return errorResponse("Authentication required.", 401);
  if (!hasTrustedMutationOrigin(request)) return errorResponse("Request origin is not allowed.", 403);
  if (new URL(request.url).search) return errorResponse("Profile request is invalid.", 400);

  try {
    const parsed = accountProfileUpdateSchema.safeParse(
      await readBoundedJson(request, MAXIMUM_BODY_BYTES),
    );
    if (!parsed.success) return errorResponse("Display name is invalid.", 400);

    const environment = getAuthEnvironment();
    if (!environment) return errorResponse("Account profile is unavailable.", 500);
    const profile = await updateAccountProfile(
      getPrisma(environment.databaseUrl),
      session.user.id,
      parsed.data.displayName,
    );
    return profile
      ? successResponse(profile)
      : errorResponse("Account profile was not found.", 404);
  } catch (error) {
    if (error instanceof InvalidJsonRequestError) {
      return errorResponse("Display name is invalid.", 400);
    }
    return errorResponse("Account profile could not be saved.", 500);
  }
}
