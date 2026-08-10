import { getInternalSession } from "@/lib/internal-auth";
import { createExpense, validateInternalSession, ValidationError } from "@/lib/internal-db";
import { apiError, apiOk } from "@/lib/api-response";

export async function POST(request: Request) {
  const rawSession = await getInternalSession();
  if (!rawSession) return apiError("Authentication required.", 401);
  const session = await validateInternalSession(rawSession, { roles: ["manager", "admin"] });
  if (!session) {
    return apiError("Forbidden.", 403);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return apiError("Request body must be valid JSON.", 400);
  try {
    const id = await createExpense({
      actorProfileId: session.profileId,
      category: String(body.category ?? ""),
      description: String(body.description ?? ""),
      amount: Number(body.amount ?? 0),
      supplier: String(body.supplier ?? ""),
      expenseDate: String(body.expenseDate ?? ""),
    });

    return apiOk({ id });
  } catch (error) {
    if (error instanceof ValidationError) return apiError(error.message, 400);
    console.error(error);
    return apiError("Unexpected server error.", 500);
  }
}
