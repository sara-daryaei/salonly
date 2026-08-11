import { apiError, apiOk } from "@/lib/api-response";
import { getInternalSession } from "@/lib/internal-auth";
import { ForbiddenError, scheduleStaffNextAppointment, validateInternalSession, ValidationError } from "@/lib/internal-db";

export async function POST(request: Request, context: { params: Promise<{ customerId: string }> }) {
  const session = await validateInternalSession(await getInternalSession(), { roles: ["staff"], requireStaff: true });
  if (!session?.staffId) return apiError("Forbidden.", 403);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return apiError("Request body must be valid JSON.", 400);
  try {
    await scheduleStaffNextAppointment({
      customerId: (await context.params).customerId,
      staffId: session.staffId,
      actorProfileId: session.profileId,
      serviceId: String(body.serviceId ?? ""),
      date: String(body.date ?? ""),
      startTime: String(body.startTime ?? ""),
      notes: String(body.notes ?? ""),
    });
    return apiOk();
  } catch (error) {
    if (error instanceof ValidationError) return apiError(error.message, 400);
    if (error instanceof ForbiddenError) return apiError("Forbidden.", 403);
    console.error(error);
    return apiError("Unexpected server error.", 500);
  }
}
