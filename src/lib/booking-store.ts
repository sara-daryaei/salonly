import { appointments as seedAppointments, type Appointment } from "@/lib/salon-data";

type BookingState = {
  appointments: Appointment[];
};

const globalForBookings = globalThis as typeof globalThis & {
  maisonEleganceBookings?: BookingState;
};

if (!globalForBookings.maisonEleganceBookings) {
  globalForBookings.maisonEleganceBookings = {
    appointments: seedAppointments.map((appointment) => ({
      ...appointment,
      createdAt: appointment.createdAt ?? "2026-08-01T09:00:00.000Z",
    })),
  };
}

export function getAppointments() {
  return globalForBookings.maisonEleganceBookings!.appointments;
}

export function mergeAppointments(extraAppointments: Appointment[] = []) {
  const byId = new Map<string, Appointment>();
  for (const appointment of getAppointments()) byId.set(appointment.id, appointment);
  for (const appointment of extraAppointments) byId.set(appointment.id, appointment);
  return Array.from(byId.values());
}

export function findAppointment(reference: string) {
  return getAppointments().find((appointment) => appointment.reference === reference);
}

export function createAppointment(appointment: Appointment) {
  getAppointments().push(appointment);
  return appointment;
}

export function parseStoredAppointments(raw?: string | null) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Appointment[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((appointment) => appointment.id && appointment.reference && appointment.serviceId && appointment.staffId);
  } catch {
    return [];
  }
}

export function serializeStoredAppointments(appointments: Appointment[]) {
  return Buffer.from(JSON.stringify(appointments.slice(-20)), "utf8").toString("base64url");
}
