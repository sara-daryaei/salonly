import { apiError, apiOk } from "@/lib/api-response";
import { getInternalSession } from "@/lib/internal-auth";
import { ForbiddenError, InvalidTransitionError, startAppointment, validateInternalSession } from "@/lib/internal-db";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const rawSession = await getInternalSession();
  if (!rawSession) return apiError("Authentication required.", 401);
  const session = await validateInternalSession(rawSession, { roles: ["staff"], requireStaff: true });
  if (!session?.staffId) return apiError("Forbidden.", 403);
  const { id } = await context.params;
  try {
    await startAppointment({ appointmentId: id, staffId: session.staffId, actorProfileId: session.profileId });
    return apiOk();
  } catch (error) {
    if (error instanceof ForbiddenError) return apiError("Forbidden.", 403);
    if (error instanceof InvalidTransitionError) return apiError(error.message, 409);
    console.error(error);
    return apiError("Unexpected server error.", 500);
  }
}
