import { NextResponse } from "next/server";
import { getInternalSession } from "@/lib/internal-auth";
import { markAppointmentStatus } from "@/lib/internal-db";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getInternalSession();
  if (!session || session.role !== "staff" || !session.staffId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const status = body.status === "cancelled" ? "cancelled" : "no_show";
  await markAppointmentStatus({
    appointmentId: id,
    staffId: session.staffId,
    actorProfileId: session.profileId,
    status,
  });

  return NextResponse.json({ ok: true });
}
