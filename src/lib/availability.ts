import { getAppointments } from "@/lib/booking-store";
import { salon, services, staff, staffById, type Appointment, type Staff } from "@/lib/salon-data";

export function getTodayBrussels() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export const TODAY_BRUSSELS = getTodayBrussels();
const SLOT_INTERVAL_MINUTES = 30;
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type AvailabilityResult = {
  availableSlots: string[];
  assignableStaffBySlot: Record<string, string>;
};

export type TimeSlot = {
  time: string;
  staffId: string;
};

export function getCapableStaff(serviceId: string) {
  return staff.filter((person) => person.services.includes(serviceId));
}

export function getCalendarAvailability(year: number, monthIndex: number, serviceId?: string, staffId?: string) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = formatDate(new Date(year, monthIndex, index + 1));
    const available = Boolean(serviceId && getAvailability({ serviceId, staffId, date }).availableSlots.length);
    return { date, available };
  });
}

export function getAvailability({
  serviceId,
  staffId,
  date,
  appointments,
}: {
  serviceId: string;
  staffId?: string;
  date: string;
  appointments?: Appointment[];
}): AvailabilityResult {
  const service = services.find((item) => item.id === serviceId);
  if (!service || !isBookableDate(date)) return { availableSlots: [], assignableStaffBySlot: {} };

  const candidates = staffId && staffId !== "any" ? [staffById(staffId)] : getCapableStaff(serviceId);
  const assignableStaffBySlot: Record<string, string> = {};
  const allSlots = new Set<string>();

  for (const person of candidates) {
    if (!person.services.includes(serviceId)) continue;
    const slots = getStaffSlots(person, service.duration, date, appointments);
    for (const slot of slots) {
      allSlots.add(slot);
      assignableStaffBySlot[slot] ??= person.id;
    }
  }

  return {
    availableSlots: Array.from(allSlots).sort(),
    assignableStaffBySlot,
  };
}

export function getTimeSlots(args: {
  serviceId: string;
  staffId?: string;
  date: string;
  appointments?: Appointment[];
}): TimeSlot[] {
  const availability = getAvailability(args);
  return availability.availableSlots.map((time) => ({
    time,
    staffId: availability.assignableStaffBySlot[time],
  }));
}

export function validateBookingRequest({
  serviceId,
  staffId,
  date,
  startTime,
  appointments,
}: {
  serviceId: string;
  staffId?: string;
  date: string;
  startTime: string;
  appointments?: Appointment[];
}) {
  const service = services.find((item) => item.id === serviceId);
  if (!service) return { ok: false as const, error: "Selected service does not exist." };

  const availability = getAvailability({ serviceId, staffId, date, appointments });
  if (!availability.availableSlots.includes(startTime)) {
    return { ok: false as const, error: "This appointment time is no longer available. Please choose another time." };
  }

  const resolvedStaffId = staffId && staffId !== "any" ? staffId : availability.assignableStaffBySlot[startTime];
  const person = staff.find((item) => item.id === resolvedStaffId);
  if (!person || !person.services.includes(serviceId)) {
    return { ok: false as const, error: "Selected professional cannot perform this service." };
  }

  return {
    ok: true as const,
    service,
    staff: person,
    endTime: minutesToTime(timeToMinutes(startTime) + service.duration),
  };
}

export function hasConflict(appointment: Appointment, date: string, start: string, end: string, staffId: string) {
  if (appointment.staffId !== staffId || appointment.date !== date) return false;
  if (!["pending", "confirmed"].includes(appointment.status)) return false;
  const requestedStart = timeToMinutes(start);
  const requestedEnd = timeToMinutes(end);
  const existingStart = timeToMinutes(appointment.start);
  const existingEnd = timeToMinutes(appointment.end);
  return requestedStart < existingEnd && requestedEnd > existingStart;
}

export function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Brussels",
  }).format(parseLocalDate(date));
}

export function parseLocalDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function buildBookingReference(date: string) {
  const compactDate = date.slice(2).replaceAll("-", "");
  const suffix = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `ME-${compactDate}-${suffix}`;
}

function getStaffSlots(person: Staff, duration: number, date: string, appointmentSource = getAppointments()) {
  const dayName = DAYS[parseLocalDate(date).getDay()];
  const workingWindow = person.schedule[dayName];
  const salonWindow = salon.hours[dayName as keyof typeof salon.hours];
  if (!workingWindow || !salonWindow || workingWindow === "Closed" || salonWindow === "Closed") return [];
  if (person.timeOff?.some((timeOff) => timeOff.date === date)) return [];

  const windowStart = Math.max(rangeStart(workingWindow), rangeStart(salonWindow));
  const windowEnd = Math.min(rangeEnd(workingWindow), rangeEnd(salonWindow));
  const lunch = person.lunchBreaks?.[dayName];
  const slots: string[] = [];

  for (let start = windowStart; start + duration <= windowEnd; start += SLOT_INTERVAL_MINUTES) {
    const end = start + duration;
    const startTime = minutesToTime(start);
    const endTime = minutesToTime(end);
    const overlapsLunch = lunch ? start < rangeEnd(lunch) && end > rangeStart(lunch) : false;
    const overlapsAppointment = appointmentSource.some((appointment) => hasConflict(appointment, date, startTime, endTime, person.id));

    if (!overlapsLunch && !overlapsAppointment) slots.push(startTime);
  }

  return slots;
}

function isBookableDate(date: string) {
  if (date < TODAY_BRUSSELS) return false;
  const day = DAYS[parseLocalDate(date).getDay()];
  return salon.hours[day as keyof typeof salon.hours] !== "Closed";
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
