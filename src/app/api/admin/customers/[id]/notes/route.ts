import { apiError, apiOk } from "@/lib/api-response";
import { addCustomerNote, adminApiGuard } from "@/lib/internal/admin";
import { getInternalSession } from "@/lib/internal-auth";
import { validateInternalSession, ValidationError } from "@/lib/internal-db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await validateInternalSession(await getInternalSession(), { roles: ["manager", "admin"] });
  const denied = adminApiGuard(session);
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  try {
    await addCustomerNote(session!, (await params).id, String(body?.note ?? ""));
    return apiOk();
  } catch (error) {
    if (error instanceof ValidationError) return apiError(error.message, 400);
    console.error(error);
    return apiError("Unexpected server error.", 500);
  }
}
