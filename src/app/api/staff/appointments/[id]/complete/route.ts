import { NextResponse } from "next/server";
import { getInternalSession } from "@/lib/internal-auth";
import { completeAppointment } from "@/lib/internal-db";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getInternalSession();
  if (!session || session.role !== "staff" || !session.staffId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();
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

  return NextResponse.json({ ok: true });
}
