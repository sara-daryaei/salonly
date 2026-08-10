import { getInternalSession } from "@/lib/internal-auth";
import { updateAppointment, adminApiGuard } from "@/lib/internal/admin";
import { validateInternalSession, ValidationError } from "@/lib/internal-db";
import { apiError, apiOk } from "@/lib/api-response";
import type { AppointmentStatus } from "@/lib/salon-data";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await validateInternalSession(await getInternalSession(), { roles: ["manager", "admin"] });
  const denied = adminApiGuard(session);
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return apiError("Request body must be valid JSON.", 400);
  try {
    await updateAppointment({
      actor: session!,
      appointmentId: (await params).id,
      status: body.status ? String(body.status) as AppointmentStatus : undefined,
      staffId: body.staffId ? String(body.staffId) : undefined,
      serviceId: body.serviceId ? String(body.serviceId) : undefined,
      date: body.date ? String(body.date) : undefined,
      time: body.time ? String(body.time) : undefined,
      notes: body.notes === undefined ? undefined : String(body.notes),
    });
    return apiOk();
  } catch (error) {
    if (error instanceof ValidationError) return apiError(error.message, 400);
    console.error(error);
    return apiError("Unexpected server error.", 500);
  }
}
