import { NextRequest, NextResponse } from "next/server";
import { getTimeSlots } from "@/lib/availability";
import { mergeAppointments, parseStoredAppointments } from "@/lib/booking-store";
import { getDatabaseAppointments, hasDatabase } from "@/lib/booking-db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const serviceId = searchParams.get("serviceId") ?? undefined;
  const staffId = searchParams.get("staffId") ?? undefined;
  const date = searchParams.get("date") ?? undefined;

  if (!serviceId || !date) {
    return NextResponse.json({ error: "Missing time availability parameters." }, { status: 400 });
  }

  const appointments = hasDatabase()
    ? await getDatabaseAppointments()
    : mergeAppointments(parseStoredAppointments(request.cookies.get("maisonEleganceBookings")?.value));
  return NextResponse.json({
    slots: getTimeSlots({ serviceId, staffId, date, appointments }),
  });
}
