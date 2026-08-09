import { NextRequest, NextResponse } from "next/server";
import { getAvailability } from "@/lib/availability";
import { mergeAppointments, parseStoredAppointments } from "@/lib/booking-store";
import { getDatabaseAppointments, hasDatabase } from "@/lib/booking-db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const serviceId = searchParams.get("serviceId") ?? undefined;
  const staffId = searchParams.get("staffId") ?? undefined;
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));

  if (!serviceId || !Number.isInteger(year) || !Number.isInteger(month)) {
    return NextResponse.json({ error: "Missing date availability parameters." }, { status: 400 });
  }

  const appointments = hasDatabase()
    ? await getDatabaseAppointments()
    : mergeAppointments(parseStoredAppointments(request.cookies.get("maisonEleganceBookings")?.value));
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const availableDates = Array.from({ length: daysInMonth }, (_, index) => {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
    return getAvailability({ serviceId, staffId, date, appointments }).availableSlots.length ? date : null;
  }).filter(Boolean);

  return NextResponse.json({ availableDates });
}
