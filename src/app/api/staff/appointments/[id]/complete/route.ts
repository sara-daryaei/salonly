import { getInternalSession } from "@/lib/internal-auth";
import { completeAppointment, ForbiddenError, InvalidTransitionError, validateInternalSession, ValidationError } from "@/lib/internal-db";
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
  try {
    await completeAppointment({
      appointmentId: id,
      staffId: session.staffId,
      actorProfileId: session.profileId,
      grossAmount: Number(body.grossAmount ?? body.amount ?? 0),
      discount: Number(body.discount ?? 0),
      tip: Number(body.tip ?? 0),
      paymentMethod: String(body.paymentMethod ?? "card"),
      note: String(body.note ?? ""),
      products: Array.isArray(body.products) ? body.products : [],
    });
  } catch (error) {
    if (error instanceof ValidationError) return apiError(error.message, 400);
    if (error instanceof ForbiddenError) return apiError("Forbidden.", 403);
    if (error instanceof InvalidTransitionError) return apiError(error.message, 409);
    console.error(error);
    return apiError("Unexpected server error.", 500);
  }

  return apiOk();
}
