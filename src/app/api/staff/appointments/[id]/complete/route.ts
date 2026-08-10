import { NextResponse } from "next/server";
import { getInternalSession } from "@/lib/internal-auth";
import { completeAppointment, ForbiddenError, InvalidTransitionError, validateInternalSession, ValidationError } from "@/lib/internal-db";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await validateInternalSession(await getInternalSession(), { roles: ["staff"], requireStaff: true });
  if (!session || !session.staffId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();
  try {
    await completeAppointment({
      appointmentId: id,
      staffId: session.staffId,
      actorProfileId: session.profileId,
      amount: Number(body.amount ?? 0),
      discount: Number(body.discount ?? 0),
      tip: Number(body.tip ?? 0),
      paymentMethod: String(body.paymentMethod ?? "card"),
      note: String(body.note ?? ""),
    });
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (error instanceof InvalidTransitionError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }

  return NextResponse.json({ ok: true });
}
