import { apiError, apiOk } from "@/lib/api-response";
import { adminApiGuard, updateSalonSettings } from "@/lib/internal/admin";
import { getInternalSession } from "@/lib/internal-auth";
import { validateInternalSession, ValidationError } from "@/lib/internal-db";

export async function PATCH(request: Request) {
  const session = await validateInternalSession(await getInternalSession(), { roles: ["manager", "admin"] });
  const denied = adminApiGuard(session);
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return apiError("Request body must be valid JSON.", 400);
  try {
    await updateSalonSettings(session!, body as Record<string, unknown>);
    return apiOk();
  } catch (error) {
    if (error instanceof ValidationError) return apiError(error.message, 400);
    console.error(error);
    return apiError("Unexpected server error.", 500);
  }
}
