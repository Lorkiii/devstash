import { errorResponse, successResponse } from "@/app/lib/api/response";
import {
  InvalidJsonRequestError,
  hasTrustedMutationOrigin,
  readBoundedJson,
} from "@/app/lib/api/request";
import { getAuthEnvironment } from "@/app/lib/auth/environment";
import { getSession } from "@/app/lib/auth/session";
import {
  THEME_COOKIE_NAME,
  themePreferenceCookieOptions,
  themePreferenceRequestSchema,
} from "@/app/lib/theme";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAXIMUM_BODY_BYTES = 64;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return errorResponse("Authentication required.", 401);
  if (!hasTrustedMutationOrigin(request)) {
    return errorResponse("Request origin is not allowed.", 403);
  }

  try {
    const parsed = themePreferenceRequestSchema.safeParse(
      await readBoundedJson(request, MAXIMUM_BODY_BYTES),
    );
    if (!parsed.success) return errorResponse("Theme preference is invalid.", 400);

    const environment = getAuthEnvironment();
    if (!environment) return errorResponse("Theme preference is unavailable.", 500);

    const response = successResponse({ theme: parsed.data.theme });
    response.cookies.set({
      name: THEME_COOKIE_NAME,
      value: parsed.data.theme,
      ...themePreferenceCookieOptions(environment.origin),
    });
    return response;
  } catch (error) {
    if (error instanceof InvalidJsonRequestError) {
      return errorResponse("Theme preference is invalid.", 400);
    }
    return errorResponse("Theme preference could not be saved.", 500);
  }
}
