import { getInternalSession } from "@/lib/internal-auth";
import { ForbiddenError, InvalidTransitionError, markAppointmentStatus, validateInternalSession } from "@/lib/internal-db";
import { apiError, apiOk } from "@/lib/api-response";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const rawSession = await getInternalSession();
  if (!rawSession) return apiError("Authentication required.", 401);
  const session = await validateInternalSession(rawSession, { roles: ["staff"], requireStaff: true });
  if (!session || !session.staffId) {
    return apiError("Forbidden.", 403);
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return apiError("Request body must be valid JSON.", 400);
  if (body.status !== "cancelled" && body.status !== "no_show") {
    return apiError("Unsupported appointment status.", 400);
  }
  const status = body.status;
  try {
    await markAppointmentStatus({
      appointmentId: id,
      staffId: session.staffId,
      actorProfileId: session.profileId,
      status,
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return apiError("Forbidden.", 403);
    if (error instanceof InvalidTransitionError) return apiError(error.message, 409);
    console.error(error);
    return apiError("Unexpected server error.", 500);
  }

  return apiOk();
}
