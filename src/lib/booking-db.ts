import postgres from "postgres";
import { appointments as seedAppointments, services, staff, type Appointment } from "@/lib/salon-data";

const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
const sql = connectionString ? postgres(connectionString, { ssl: "require", max: 1 }) : null;
let schemaReady: Promise<void> | null = null;

const dayIndex: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export function hasDatabase() {
  return Boolean(sql);
}

export async function ensureBookingSchema() {
  if (!sql) return;
  schemaReady ??= initializeSchema();
  await schemaReady;
}

export async function getDatabaseAppointments() {
  if (!sql) return [];
  await ensureBookingSchema();
  const rows = await sql`
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
  if (!sql) return null;
  await ensureBookingSchema();
  const rows = await sql`
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
  if (!sql) throw new Error("Database is not configured.");
  await ensureBookingSchema();

  try {
    const rows = await sql.begin(async (tx) => {
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

async function initializeSchema() {
  if (!sql) return;
  await sql`create extension if not exists btree_gist`;
  await sql`
    do $$ begin
      create type appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
    exception when duplicate_object then null;
    end $$
  `;
  await sql`
    create table if not exists services (
      id text primary key,
      name text not null,
      category text not null,
      description text not null,
      price integer not null,
      duration integer not null,
      image_url text,
      active boolean not null default true,
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists staff (
      id text primary key,
      photo_url text,
      first_name text not null,
      last_name text not null,
      job_title text not null,
      bio text not null,
      phone text,
      email text,
      languages text[] not null default '{}',
      specialties text[] not null default '{}',
      active boolean not null default true
    )
  `;
  await sql`
    create table if not exists staff_services (
      staff_id text not null references staff(id) on delete cascade,
      service_id text not null references services(id) on delete cascade,
      primary key (staff_id, service_id)
    )
  `;
  await sql`
    create table if not exists staff_working_hours (
      id uuid primary key default gen_random_uuid(),
      staff_id text not null references staff(id) on delete cascade,
      day_of_week integer not null check (day_of_week between 0 and 6),
      start_time time not null,
      end_time time not null,
      lunch_start time,
      lunch_end time,
      active boolean not null default true
    )
  `;
  await sql`
    create table if not exists staff_time_off (
      id uuid primary key default gen_random_uuid(),
      staff_id text not null references staff(id) on delete cascade,
      starts_at timestamptz not null,
      ends_at timestamptz not null,
      reason text
    )
  `;
  await sql`
    create table if not exists customers (
      id uuid primary key default gen_random_uuid(),
      first_name text not null,
      last_name text not null,
      email text not null,
      phone text not null,
      notes text,
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists appointments (
      id uuid primary key default gen_random_uuid(),
      booking_reference text unique not null,
      customer_id uuid not null references customers(id),
      service_id text not null references services(id),
      staff_id text not null references staff(id),
      start_at timestamptz not null,
      end_at timestamptz not null,
      duration integer not null,
      price integer not null,
      status appointment_status not null default 'confirmed',
      notes text,
      created_at timestamptz not null default now(),
      check (end_at > start_at)
    )
  `;
  await sql`
    do $$ begin
      alter table appointments
        add constraint appointments_no_staff_overlap
        exclude using gist (
          staff_id with =,
          tstzrange(start_at, end_at, '[)') with &&
        )
        where (status in ('pending', 'confirmed'));
    exception when duplicate_object then null;
    end $$
  `;

  await seedReferenceData();
}

async function seedReferenceData() {
  if (!sql) return;
  for (const service of services) {
    await sql`
      insert into services (id, name, category, description, price, duration, image_url, active)
      values (${service.id}, ${service.name}, ${service.category}, ${service.description}, ${service.price}, ${service.duration}, ${service.image}, ${service.active})
      on conflict (id) do update set
        name = excluded.name,
        category = excluded.category,
        description = excluded.description,
        price = excluded.price,
        duration = excluded.duration,
        image_url = excluded.image_url,
        active = excluded.active
    `;
  }
  for (const person of staff) {
    await sql`
      insert into staff (id, photo_url, first_name, last_name, job_title, bio, phone, email, languages, specialties, active)
      values (${person.id}, ${person.photo}, ${person.firstName}, ${person.lastName}, ${person.title}, ${person.bio}, ${person.phone}, ${person.email}, ${person.languages}, ${person.specialties}, true)
      on conflict (id) do update set
        photo_url = excluded.photo_url,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        job_title = excluded.job_title,
        bio = excluded.bio,
        phone = excluded.phone,
        email = excluded.email,
        languages = excluded.languages,
        specialties = excluded.specialties,
        active = excluded.active
    `;
    for (const serviceId of person.services) {
      await sql`
        insert into staff_services (staff_id, service_id)
        values (${person.id}, ${serviceId})
        on conflict do nothing
      `;
    }
    for (const [day, range] of Object.entries(person.schedule)) {
      const [start, end] = range.split("-");
      const lunch = person.lunchBreaks?.[day]?.split("-");
      await sql`
        insert into staff_working_hours (staff_id, day_of_week, start_time, end_time, lunch_start, lunch_end, active)
        values (${person.id}, ${dayIndex[day]}, ${start}, ${end}, ${lunch?.[0] ?? null}, ${lunch?.[1] ?? null}, true)
      `;
    }
  }

  const existing = await sql`select count(*)::int as count from appointments`;
  if (existing[0]?.count) return;

  for (const appointment of seedAppointments) {
    const [firstName, ...rest] = appointment.customer.split(" ");
    const lastName = rest.join(" ") || "Client";
    const [customer] = await sql`
      insert into customers (first_name, last_name, email, phone)
      values (${firstName}, ${lastName}, ${appointment.email}, ${appointment.phone})
      returning id
    `;
    await sql`
      insert into appointments (booking_reference, customer_id, service_id, staff_id, start_at, end_at, duration, price, status, notes)
      values (${appointment.reference}, ${customer.id}, ${appointment.serviceId}, ${appointment.staffId}, ${brusselsDateTimeToUtc(appointment.date, appointment.start).toISOString()}, ${brusselsDateTimeToUtc(appointment.date, appointment.end).toISOString()}, ${appointment.duration}, ${appointment.price}, ${appointment.status}, ${appointment.notes ?? null})
      on conflict (booking_reference) do nothing
    `;
  }
}

function mapAppointmentRow(row: Record<string, unknown>): Appointment {
  const start = row.start_at as Date;
  const end = row.end_at as Date;
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

function brusselsParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
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
