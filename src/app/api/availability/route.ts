import { NextRequest, NextResponse } from "next/server";
import { getAvailability } from "@/lib/availability";
import { mergeAppointments, parseStoredAppointments } from "@/lib/booking-store";
import { getDatabaseAvailability, hasDatabase } from "@/lib/booking-db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const serviceId = searchParams.get("serviceId") ?? undefined;
  const staffId = searchParams.get("staffId") ?? undefined;
  const date = searchParams.get("date") ?? undefined;
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  if (serviceId && date) {
    if (hasDatabase()) return NextResponse.json(await getDatabaseAvailability({ serviceId, staffId, date }));
    const appointments = mergeAppointments(parseStoredAppointments(request.cookies.get("maisonEleganceBookings")?.value));
    return NextResponse.json(getAvailability({ serviceId, staffId, date, appointments }));
  }

  if (serviceId && Number.isInteger(year) && Number.isInteger(month)) {
    if (hasDatabase()) {
      return NextResponse.json({
        days: await Promise.all(Array.from({ length: new Date(year, month + 1, 0).getDate() }, async (_, index) => {
          const dateValue = `${year}-${String(month + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
          return {
            date: dateValue,
            available: Boolean((await getDatabaseAvailability({ serviceId, staffId, date: dateValue })).availableSlots.length),
          };
        })),
      });
    }
    const appointments = mergeAppointments(parseStoredAppointments(request.cookies.get("maisonEleganceBookings")?.value));
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
