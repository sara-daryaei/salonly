import { NextRequest, NextResponse } from "next/server";
import { getAvailability } from "@/lib/availability";
import { mergeAppointments, parseStoredAppointments } from "@/lib/booking-store";
import { getDatabaseAppointments, hasDatabase } from "@/lib/booking-db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const serviceId = searchParams.get("serviceId") ?? undefined;
  const staffId = searchParams.get("staffId") ?? undefined;
  const date = searchParams.get("date") ?? undefined;
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  const appointments = hasDatabase()
    ? await getDatabaseAppointments()
    : mergeAppointments(parseStoredAppointments(request.cookies.get("maisonEleganceBookings")?.value));

  if (serviceId && date) {
    return NextResponse.json(getAvailability({ serviceId, staffId, date, appointments }));
  }

  if (serviceId && Number.isInteger(year) && Number.isInteger(month)) {
    return NextResponse.json({
      days: Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, index) => {
        const dateValue = `${year}-${String(month + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
        return {
          date: dateValue,
          available: Boolean(getAvailability({ serviceId, staffId, date: dateValue, appointments }).availableSlots.length),
        };
      }),
    });
  }

  return NextResponse.json({ error: "Missing availability parameters." }, { status: 400 });
}
