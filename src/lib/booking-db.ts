import { hasDatabase, requireDatabase } from "@/lib/db";
import { brusselsParts } from "@/lib/time";
import { blockingAppointmentStatuses, blocksAppointmentAvailability } from "@/lib/security-rules";
import type { Appointment, Service, Staff } from "@/lib/salon-data";

export { hasDatabase };
export async function getDatabaseAppointments() {
  const db = requireDatabase();
  const rows = await db`
    select
      a.id::text,
      a.booking_reference,
      c.first_name,
      c.last_name,
      c.email,
      c.phone,
      a.service_id,
      a.staff_id,
      a.start_at,
      a.end_at,
      a.duration,
      a.price,
      a.status::text,
      a.notes,
      a.created_at
    from appointments a
    join customers c on c.id = a.customer_id
    order by a.start_at desc
  `;
  return rows.map(mapAppointmentRow);
}

export async function findDatabaseAppointment(reference: string) {
  const db = requireDatabase();
  const rows = await db`
    select
      a.id::text,
      a.booking_reference,
      c.first_name,
      c.last_name,
      c.email,
      c.phone,
      a.service_id,
      a.staff_id,
      a.start_at,
      a.end_at,
      a.duration,
      a.price,
      a.status::text,
      a.notes,
      a.created_at
    from appointments a
    join customers c on c.id = a.customer_id
    where a.booking_reference = ${reference}
    limit 1
  `;
  return rows[0] ? mapAppointmentRow(rows[0]) : null;
}

export async function createDatabaseAppointment(input: {
  reference: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  serviceId: string;
  staffId: string;
  startAt: Date;
  endAt: Date;
  duration: number;
  price: number;
}) {
  const db = requireDatabase();
  try {
    const rows = await db.begin(async (tx) => {
      const [customer] = await tx`
        insert into customers (first_name, last_name, email, phone)
        values (${input.firstName}, ${input.lastName}, ${input.email}, ${input.phone})
        returning id
      `;
      return tx`
        insert into appointments (
          booking_reference,
          customer_id,
          service_id,
          staff_id,
          start_at,
          end_at,
          duration,
          price,
          status,
          notes
        )
        values (
          ${input.reference},
          ${customer.id},
          ${input.serviceId},
          ${input.staffId},
          ${input.startAt.toISOString()},
          ${input.endAt.toISOString()},
          ${input.duration},
          ${input.price},
          'confirmed',
          'Booked from public website.'
        )
        returning id::text
      `;
    });
    return rows[0]?.id as string;
  } catch (error) {
    if (isExclusionViolation(error)) {
      throw new AppointmentConflictError();
    }
    throw error;
  }
}

export async function validateDatabaseBookingRequest(input: {
  serviceId: string;
  staffId?: string;
  date: string;
  startTime: string;
}) {
  const service = await getDatabaseService(input.serviceId);
  if (!service) return { ok: false as const, error: "Selected service does not exist." };

  const availability = await getDatabaseAvailability({
    serviceId: input.serviceId,
    staffId: input.staffId,
    date: input.date,
  });
  if (!availability.availableSlots.includes(input.startTime)) {
    return { ok: false as const, error: "This appointment time is no longer available. Please choose another time." };
  }

  const resolvedStaffId = input.staffId && input.staffId !== "any" ? input.staffId : availability.assignableStaffBySlot[input.startTime];
  const person = await getDatabaseStaffForService(resolvedStaffId, input.serviceId);
  if (!person) return { ok: false as const, error: "Selected professional cannot perform this service." };

  return {
    ok: true as const,
    service,
    staff: person,
    endTime: minutesToTime(timeToMinutes(input.startTime) + service.duration),
  };
}

export async function getDatabaseAvailability(input: { serviceId: string; staffId?: string; date: string }) {
  const service = await getDatabaseService(input.serviceId);
  const dayOfWeek = parseLocalDate(input.date).getDay();
  const [settings, salonWindows] = await Promise.all([getBookingSettings(), getSalonOpeningWindows(dayOfWeek)]);
  if (!service || !isWithinBookingWindow(input.date, settings) || !salonWindows.length) return { availableSlots: [], assignableStaffBySlot: {} as Record<string, string> };

  const candidates = await getDatabaseCapableStaff(input.serviceId, input.staffId);
  const appointments = await getDatabaseAppointmentsForDate(input.date);
  const timeOffByStaff = await getStaffTimeOffWindows(candidates.map((person) => person.id), input.date);
  const assignableStaffBySlot: Record<string, string> = {};
  const allSlots = new Set<string>();

  for (const person of candidates) {
    const slots = await getStaffSlots(person, service.duration, input.date, salonWindows, appointments, timeOffByStaff.get(person.id) ?? [], settings);
    for (const slot of slots) {
      allSlots.add(slot);
      assignableStaffBySlot[slot] ??= person.id;
    }
  }

  return { availableSlots: Array.from(allSlots).sort(), assignableStaffBySlot };
}

export async function getDatabaseTimeSlots(input: { serviceId: string; staffId?: string; date: string }) {
  const availability = await getDatabaseAvailability(input);
  return availability.availableSlots.map((time) => ({ time, staffId: availability.assignableStaffBySlot[time] }));
}

export class AppointmentConflictError extends Error {
  constructor() {
    super("This appointment time is no longer available.");
    this.name = "AppointmentConflictError";
  }
}

export function brusselsDateTimeToUtc(date: string, time: string) {
  const offset = getBrusselsOffset(date, time);
  return new Date(`${date}T${time}:00${offset}`);
}

function isExclusionViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23P01";
}

async function getDatabaseService(serviceId: string) {
  const db = requireDatabase();
  const rows = await db`
    select id, name, category, description, price, duration, image_url, active
    from services
    where id = ${serviceId} and active = true
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category) as Service["category"],
    description: String(row.description),
    price: Number(row.price),
    duration: Number(row.duration),
    image: String(row.image_url ?? ""),
    active: Boolean(row.active),
  };
}

async function getDatabaseStaffForService(staffId: string, serviceId: string) {
  return (await getDatabaseCapableStaff(serviceId, staffId))[0] ?? null;
}

async function getDatabaseCapableStaff(serviceId: string, staffId?: string) {
  const db = requireDatabase();
  const rows = staffId && staffId !== "any"
    ? await db`
      select st.id, st.photo_url, st.first_name, st.last_name, st.job_title, st.bio, st.phone, st.email, st.languages, st.specialties
      from staff st
      join staff_services ss on ss.staff_id = st.id
      where st.active = true and ss.service_id = ${serviceId} and st.id = ${staffId}
    `
    : await db`
      select st.id, st.photo_url, st.first_name, st.last_name, st.job_title, st.bio, st.phone, st.email, st.languages, st.specialties
      from staff st
      join staff_services ss on ss.staff_id = st.id
      where st.active = true and ss.service_id = ${serviceId}
      order by st.first_name
    `;
  return rows.map((row) => ({
    id: String(row.id),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    title: String(row.job_title),
    bio: String(row.bio),
    photo: String(row.photo_url ?? ""),
    specialties: Array.isArray(row.specialties) ? row.specialties.map(String) : [],
    experience: "",
    languages: Array.isArray(row.languages) ? row.languages.map(String) : [],
    services: [serviceId],
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    schedule: {},
    lunchBreaks: {},
    timeOff: [],
  }));
}

async function getDatabaseAppointmentsForDate(date: string) {
  const db = requireDatabase();
  const start = brusselsDateTimeToUtc(date, "00:00");
  const end = brusselsDateTimeToUtc(date, "23:59");
  const rows = await db`
    select id::text, staff_id, start_at, end_at, status::text
    from appointments
    where start_at >= ${start.toISOString()}
      and start_at <= ${end.toISOString()}
      and status = any(${blockingAppointmentStatuses}::appointment_status[])
  `;
  return rows.map((row) => {
    const startParts = brusselsParts(new Date(row.start_at as Date));
    const endParts = brusselsParts(new Date(row.end_at as Date));
    return {
      id: String(row.id),
      staffId: String(row.staff_id),
      date: startParts.date,
      start: startParts.time,
      end: endParts.time,
      status: row.status as Appointment["status"],
    };
  });
}

async function getWorkingHours(staffId: string, dayOfWeek: number) {
  const db = requireDatabase();
  return db`
    select start_time::text, end_time::text, lunch_start::text, lunch_end::text
    from staff_working_hours
    where staff_id = ${staffId} and day_of_week = ${dayOfWeek} and active = true
    order by start_time
  `;
}

async function getSalonOpeningWindows(dayOfWeek: number) {
  const db = requireDatabase();
  const rows = await db`
    select open_time::text, close_time::text
    from salon_opening_hours
    where day_of_week = ${dayOfWeek}
      and active = true
      and open_time is not null
      and close_time is not null
    order by open_time
  `;
  return rows.map((row) => ({
    start: String(row.open_time).slice(0, 5),
    end: String(row.close_time).slice(0, 5),
  }));
}

async function getStaffTimeOffWindows(staffIds: string[], date: string) {
  if (!staffIds.length) return new Map<string, { start: string; end: string }[]>();
  const db = requireDatabase();
  const start = brusselsDateTimeToUtc(date, "00:00");
  const end = brusselsDateTimeToUtc(date, "23:59");
  const rows = await db`
    select staff_id, starts_at, ends_at
    from staff_time_off
    where staff_id = any(${staffIds})
      and tstzrange(starts_at, ends_at, '[)') && tstzrange(${start.toISOString()}, ${end.toISOString()}, '[)')
  `;
  const byStaff = new Map<string, { start: string; end: string }[]>();
  for (const row of rows) {
    const staffId = String(row.staff_id);
    const windows = byStaff.get(staffId) ?? [];
    windows.push({ start: brusselsParts(new Date(row.starts_at as Date)).time, end: brusselsParts(new Date(row.ends_at as Date)).time });
    byStaff.set(staffId, windows);
  }
  return byStaff;
}

async function getStaffSlots(
  person: Staff,
  duration: number,
  date: string,
  salonWindows: { start: string; end: string }[],
  appointmentSource: Pick<Appointment, "staffId" | "date" | "start" | "end" | "status">[],
  timeOffWindows: { start: string; end: string }[],
  settings: BookingSettings,
) {
  const dayOfWeek = parseLocalDate(date).getDay();
  const workingWindows = await getWorkingHours(person.id, dayOfWeek);
  const slots: string[] = [];

  for (const window of workingWindows) {
    const staffStart = timeToMinutes(String(window.start_time).slice(0, 5));
    const staffEnd = timeToMinutes(String(window.end_time).slice(0, 5));
    for (const salonWindow of salonWindows) {
      const windowStart = Math.max(staffStart, timeToMinutes(salonWindow.start));
      const windowEnd = Math.min(staffEnd, timeToMinutes(salonWindow.end));
      const lunch = window.lunch_start && window.lunch_end ? `${String(window.lunch_start).slice(0, 5)}-${String(window.lunch_end).slice(0, 5)}` : null;

      for (let start = windowStart; start + duration <= windowEnd; start += settings.slotIntervalMinutes) {
        const end = start + duration;
        const startTime = minutesToTime(start);
        const endTime = minutesToTime(end);
        const overlapsLunch = lunch ? start < rangeEnd(lunch) && end > rangeStart(lunch) : false;
        const overlapsAppointment = appointmentSource.some((appointment) => hasConflict(appointment, date, startTime, endTime, person.id));
        const overlapsTimeOff = timeOffWindows.some((timeOff) => rangesOverlap(start, end, timeToMinutes(timeOff.start), timeToMinutes(timeOff.end)));
        const startsAfterNotice = brusselsDateTimeToUtc(date, startTime).getTime() >= settings.minimumStartAt.getTime();
        if (!overlapsLunch && !overlapsAppointment && !overlapsTimeOff && startsAfterNotice) slots.push(startTime);
      }
    }
  }

  return slots;
}

function mapAppointmentRow(row: Record<string, unknown>): Appointment {
  const start = new Date(row.start_at as Date);
  const end = new Date(row.end_at as Date);
  const startParts = brusselsParts(start);
  const endParts = brusselsParts(end);
  return {
    id: String(row.id),
    reference: String(row.booking_reference),
    customer: `${String(row.first_name)} ${String(row.last_name)}`,
    email: String(row.email),
    phone: String(row.phone),
    serviceId: String(row.service_id),
    staffId: String(row.staff_id),
    date: startParts.date,
    start: startParts.time,
    end: endParts.time,
    duration: Number(row.duration),
    price: Number(row.price),
    status: row.status as Appointment["status"],
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: row.created_at ? new Date(row.created_at as Date).toISOString() : undefined,
  };
}

function hasConflict(appointment: Pick<Appointment, "staffId" | "date" | "start" | "end" | "status">, date: string, start: string, end: string, staffId: string) {
  if (appointment.staffId !== staffId || appointment.date !== date) return false;
  if (!blocksAppointmentAvailability(appointment.status)) return false;
  const requestedStart = timeToMinutes(start);
  const requestedEnd = timeToMinutes(end);
  const existingStart = timeToMinutes(appointment.start);
  const existingEnd = timeToMinutes(appointment.end);
  return rangesOverlap(requestedStart, requestedEnd, existingStart, existingEnd);
}

type BookingSettings = {
  minimumStartAt: Date;
  maximumDate: string;
  slotIntervalMinutes: number;
};

async function getBookingSettings(): Promise<BookingSettings> {
  const db = requireDatabase();
  const rows = await db`
    select minimum_booking_notice_minutes, maximum_booking_period_days, appointment_slot_interval_minutes
    from salon_settings
    where id = 'maison-elegance'
    limit 1
  `;
  const row = rows[0] ?? {};
  const notice = positiveOrDefault(row.minimum_booking_notice_minutes, 120, true);
  const period = positiveOrDefault(row.maximum_booking_period_days, 90);
  const interval = positiveOrDefault(row.appointment_slot_interval_minutes, 30);
  const now = new Date();
  const minimumStartAt = new Date(now.getTime() + notice * 60000);
  const maximumDate = addBrusselsDays(brusselsParts(now).date, period);
  return { minimumStartAt, maximumDate, slotIntervalMinutes: interval };
}

function isWithinBookingWindow(date: string, settings: BookingSettings) {
  const today = brusselsParts().date;
  return date >= today && date <= settings.maximumDate;
}

function positiveOrDefault(value: unknown, fallback: number, allowZero = false) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || (!allowZero && parsed <= 0)) return fallback;
  return Math.trunc(parsed);
}

function addBrusselsDays(date: string, days: number) {
  const parsed = brusselsDateTimeToUtc(date, "12:00");
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return brusselsParts(parsed).date;
}

function rangesOverlap(start: number, end: number, existingStart: number, existingEnd: number) {
  return start < existingEnd && end > existingStart;
}

function parseLocalDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function rangeStart(range: string) {
  return timeToMinutes(range.split("-")[0]);
}

function rangeEnd(range: string) {
  return timeToMinutes(range.split("-")[1]);
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getBrusselsOffset(date: string, time: string) {
  const probe = new Date(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Brussels",
    timeZoneName: "shortOffset",
    hour: "2-digit",
  }).formatToParts(probe);
  const offsetName = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT+1";
  const match = offsetName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return "+01:00";
  const sign = match[1];
  const hours = match[2].padStart(2, "0");
  const minutes = match[3] ?? "00";
  return `${sign}${hours}:${minutes}`;
}
