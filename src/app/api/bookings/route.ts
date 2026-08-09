import { NextRequest, NextResponse } from "next/server";
import { buildBookingReference, validateBookingRequest } from "@/lib/availability";
import { createAppointment, findAppointment, mergeAppointments, parseStoredAppointments, serializeStoredAppointments } from "@/lib/booking-store";
import { AppointmentConflictError, brusselsDateTimeToUtc, createDatabaseAppointment, findDatabaseAppointment, getDatabaseAppointments, hasDatabase } from "@/lib/booking-db";
import type { Appointment } from "@/lib/salon-data";

export const dynamic = "force-dynamic";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9][0-9\s().-]{6,}$/;

export function GET(request: NextRequest) {
  if (hasDatabase()) {
    return getDatabaseBookings(request);
  }

  const storedAppointments = parseStoredAppointments(request.cookies.get("maisonEleganceBookings")?.value);
  const appointments = mergeAppointments(storedAppointments);
  const reference = request.nextUrl.searchParams.get("reference");
  if (reference) {
    const appointment = appointments.find((item) => item.reference === reference) ?? findAppointment(reference);
    if (!appointment) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    return NextResponse.json({ appointment });
  }

  return NextResponse.json({ appointments });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid booking request." }, { status: 400 });

  const errors = validateCustomer(body);
  if (errors.length) return NextResponse.json({ error: errors[0], errors }, { status: 400 });

  if (hasDatabase()) {
    return createDatabaseBooking(body);
  }

  const storedAppointments = parseStoredAppointments(request.cookies.get("maisonEleganceBookings")?.value);
  const appointments = mergeAppointments(storedAppointments);
  return createCookieBooking(body, appointments, storedAppointments);
}

async function getDatabaseBookings(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference");
  if (reference) {
    const appointment = await findDatabaseAppointment(reference);
    if (!appointment) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    return NextResponse.json({ appointment });
  }
  return NextResponse.json({ appointments: await getDatabaseAppointments() });
}

async function createDatabaseBooking(body: Record<string, unknown>) {
  const appointments = await getDatabaseAppointments();
  const staffId = body.staffId === "any" ? undefined : String(body.staffId);
  const validation = validateBookingRequest({
    serviceId: String(body.serviceId),
    staffId,
    date: String(body.date),
    startTime: String(body.startTime),
    appointments,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 409 });
  }

  const reference = buildBookingReference(String(body.date));
  try {
    await createDatabaseAppointment({
      reference,
      firstName: String(body.firstName).trim(),
      lastName: String(body.lastName).trim(),
      email: String(body.email).trim(),
      phone: String(body.phone).trim(),
      serviceId: validation.service.id,
      staffId: validation.staff.id,
      startAt: brusselsDateTimeToUtc(String(body.date), String(body.startTime)),
      endAt: brusselsDateTimeToUtc(String(body.date), validation.endTime),
      duration: validation.service.duration,
      price: validation.service.price,
    });
  } catch (error) {
    if (error instanceof AppointmentConflictError) {
      return NextResponse.json({ error: "This appointment time was just booked by another customer. Please select another available time." }, { status: 409 });
    }
    throw error;
  }

  const appointment = await findDatabaseAppointment(reference);
  return NextResponse.json({ appointment }, { status: 201 });
}

function createCookieBooking(body: Record<string, unknown>, appointments: Appointment[], storedAppointments: Appointment[]) {
  const staffId = body.staffId === "any" ? undefined : String(body.staffId);
  const validation = validateBookingRequest({
    serviceId: String(body.serviceId),
    staffId,
    date: String(body.date),
    startTime: String(body.startTime),
    appointments,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 409 });
  }

  const appointment: Appointment = {
    id: crypto.randomUUID(),
    reference: buildBookingReference(String(body.date)),
    customer: `${String(body.firstName).trim()} ${String(body.lastName).trim()}`,
    email: String(body.email).trim(),
    phone: String(body.phone).trim(),
    serviceId: validation.service.id,
    staffId: validation.staff.id,
    date: String(body.date),
    start: String(body.startTime),
    end: validation.endTime,
    duration: validation.service.duration,
    price: validation.service.price,
    status: "confirmed",
    notes: "Booked from public website.",
    createdAt: new Date().toISOString(),
  };

  createAppointment(appointment);
  const response = NextResponse.json({ appointment }, { status: 201 });
  response.cookies.set("maisonEleganceBookings", serializeStoredAppointments([...storedAppointments, appointment]), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

function validateCustomer(body: Record<string, unknown>) {
  const errors: string[] = [];
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();

  if (!body.serviceId) errors.push("Please choose a service.");
  if (!body.staffId) errors.push("Please choose a professional preference.");
  if (!body.date) errors.push("Please choose a date.");
  if (!body.startTime) errors.push("Please choose a time.");
  if (!firstName) errors.push("First name is required.");
  if (!lastName) errors.push("Last name is required.");
  if (!emailPattern.test(email)) errors.push("Please enter a valid email address.");
  if (!phonePattern.test(phone)) errors.push("Please enter a valid phone number.");

  return errors;
}
