import { apiError, apiOk } from "@/lib/api-response";
import { getInternalSession } from "@/lib/internal-auth";
import { ForbiddenError, InvalidTransitionError, sellAppointmentProduct, validateInternalSession, ValidationError } from "@/lib/internal-db";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const rawSession = await getInternalSession();
  if (!rawSession) return apiError("Authentication required.", 401);
  const session = await validateInternalSession(rawSession, { roles: ["staff"], requireStaff: true });
  if (!session?.staffId) return apiError("Forbidden.", 403);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return apiError("Request body must be valid JSON.", 400);
  const { id } = await context.params;
  try {
    await sellAppointmentProduct({
      appointmentId: id,
      staffId: session.staffId,
      actorProfileId: session.profileId,
      productId: String("productId" in body ? body.productId : ""),
      quantity: Number("quantity" in body ? body.quantity : 0),
      paymentMethod: String("paymentMethod" in body ? body.paymentMethod : ""),
    });
    return apiOk();
  } catch (error) {
    if (error instanceof ValidationError) return apiError(error.message, 400);
    if (error instanceof ForbiddenError) return apiError("Forbidden.", 403);
    if (error instanceof InvalidTransitionError) return apiError(error.message, 409);
    console.error(error);
    return apiError("Unexpected server error.", 500);
  }
}
