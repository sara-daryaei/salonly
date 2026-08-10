import { NextResponse } from "next/server";
import { getInternalSession } from "@/lib/internal-auth";
import { ForbiddenError, InvalidTransitionError, markAppointmentStatus, validateInternalSession } from "@/lib/internal-db";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await validateInternalSession(await getInternalSession(), { roles: ["staff"], requireStaff: true });
  if (!session || !session.staffId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();
  if (body.status !== "cancelled" && body.status !== "no_show") {
    return NextResponse.json({ error: "Unsupported appointment status." }, { status: 400 });
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
    if (error instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (error instanceof InvalidTransitionError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }

  return NextResponse.json({ ok: true });
}
