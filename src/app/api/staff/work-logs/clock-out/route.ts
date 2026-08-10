import { apiError, apiOk } from "@/lib/api-response";
import { getInternalSession } from "@/lib/internal-auth";
import { validateInternalSession } from "@/lib/internal-db";
import { clockOut } from "@/lib/internal/work-logs";

export async function POST() {
  const rawSession = await getInternalSession();
  if (!rawSession) return apiError("Authentication required.", 401);
  const session = await validateInternalSession(rawSession, { roles: ["staff"], requireStaff: true });
  if (!session?.staffId) return apiError("Forbidden.", 403);
  try {
    return apiOk(await clockOut(session.staffId));
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Could not clock out.", 409);
  }
}
