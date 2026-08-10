import { createHash } from "crypto";
import postgres from "postgres";
import { ensureBookingSchema } from "@/lib/booking-db";
import { services, staff, type Appointment } from "@/lib/salon-data";
import type { InternalRole, InternalSession } from "@/lib/internal-auth";

const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
const sql = connectionString ? postgres(connectionString, { ssl: "require", max: 1 }) : null;
let ready: Promise<void> | null = null;

export type InternalAppointment = Appointment & {
  appointmentId: string;
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  serviceName: string;
  staffFirstName: string;
  staffLastName: string;
};

export type DashboardMetrics = {
  appointments: number;
  completed: number;
  revenue: number;
  tips: number;
  averageTicket: number;
  cancelled: number;
  noShow: number;
};

export type AdminDashboardData = Awaited<ReturnType<typeof getAdminDashboardData>>;
export type StaffDashboardData = Awaited<ReturnType<typeof getStaffDashboardData>>;

export function hashPassword(password: string) {
  return createHash("sha256").update(`maison:${password}`).digest("hex");
}

export async function ensureInternalSchema() {
  if (!sql) return;
  ready ??= initializeInternalSchema();
  await ready;
}

export async function authenticateInternalUser(email: string, password: string): Promise<InternalSession | null> {
  if (!sql) return null;
  await ensureInternalSchema();
  const rows = await sql`
    select id::text, first_name, last_name, email, role::text, staff_id, password_hash
    from profiles
    where lower(email) = lower(${email}) and active = true
    limit 1
  `;
  const user = rows[0];
  if (!user || user.password_hash !== hashPassword(password)) return null;
  return {
    profileId: String(user.id),
    email: String(user.email),
    role: user.role as InternalRole,
    staffId: user.staff_id ? String(user.staff_id) : null,
    name: `${String(user.first_name)} ${String(user.last_name)}`,
  };
}

export async function getStaffDashboardData(staffId: string) {
  await ensureInternalSchema();
  const appointments = await getAppointments({ staffId });
  const transactions = await getTransactions({ staffId });
  const today = new Date().toISOString().slice(0, 10);
  const todaysAppointments = appointments.filter((appointment) => appointment.date === today);
  const todaysTransactions = transactions.filter((transaction) => String(transaction.created_at).slice(0, 10) === today);
  const person = staff.find((item) => item.id === staffId) ?? staff[0];
  return {
    staff: person,
    appointments,
    todaysAppointments,
    metrics: calculateMetrics(todaysAppointments, todaysTransactions),
    transactions,
  };
}

export async function getAdminDashboardData() {
  await ensureInternalSchema();
  const [appointments, transactions, expenses, workLogs] = await Promise.all([
    getAppointments({}),
    getTransactions({}),
    sql!`select id::text, category, description, amount, expense_date::text, supplier, created_at::text from expenses order by expense_date desc, created_at desc`,
    sql!`select id::text, staff_id, work_date::text, clock_in::text, clock_out::text, break_minutes, notes from staff_work_logs order by work_date desc`,
  ]);
  const metrics = calculateMetrics(appointments, transactions);
  const revenueByStaff = staff.map((person) => {
    const personAppointments = appointments.filter((appointment) => appointment.staffId === person.id);
    const personTransactions = transactions.filter((transaction) => transaction.staff_id === person.id);
    const revenue = personTransactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const tips = personTransactions.reduce((sum, transaction) => sum + Number(transaction.tip), 0);
    return {
      staffId: person.id,
      name: `${person.firstName} ${person.lastName}`,
      appointments: personAppointments.length,
      completed: personAppointments.filter((appointment) => appointment.status === "completed").length,
      revenue,
      averageTicket: personTransactions.length ? revenue / personTransactions.length : 0,
      tips,
    };
  });
  const revenueByService = services.map((service) => {
    const serviceAppointments = appointments.filter((appointment) => appointment.serviceId === service.id);
    const revenue = serviceAppointments.filter((appointment) => appointment.status === "completed").reduce((sum, appointment) => sum + appointment.price, 0);
    return { serviceId: service.id, name: service.name, bookings: serviceAppointments.length, revenue };
  }).filter((item) => item.bookings > 0);
  return {
    metrics,
    appointments,
    transactions,
    expenses,
    workLogs,
    revenueByStaff,
    revenueByService,
    operationalResult: metrics.revenue - expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
  };
}

export async function completeAppointment(input: {
  appointmentId: string;
  staffId: string;
  actorProfileId: string;
  amount: number;
  discount: number;
  tip: number;
  paymentMethod: string;
  note: string;
}) {
  if (!sql) throw new Error("Database is not configured.");
  await ensureInternalSchema();
  const [appointment] = await sql`
    select id, customer_id, staff_id, service_id
    from appointments
    where id = ${input.appointmentId}
    limit 1
  `;
  if (!appointment || String(appointment.staff_id) !== input.staffId) throw new Error("Not authorized for this appointment.");
  await sql.begin(async (tx) => {
    await tx`
      update appointments
      set status = 'completed', notes = coalesce(notes, '') || ${input.note ? `\nService note: ${input.note}` : ""}
      where id = ${input.appointmentId}
    `;
    await tx`
      insert into transactions (appointment_id, customer_id, staff_id, amount, discount, tip, payment_method, payment_status, transaction_type)
      values (${input.appointmentId}, ${appointment.customer_id}, ${appointment.staff_id}, ${input.amount}, ${input.discount}, ${input.tip}, ${input.paymentMethod}, 'paid', 'service')
    `;
    if (input.note) {
      await tx`
        insert into customer_notes (customer_id, staff_id, note)
        values (${appointment.customer_id}, ${appointment.staff_id}, ${input.note})
      `;
    }
    await tx`
      insert into audit_logs (user_id, action, entity_type, entity_id, metadata)
      values (${input.actorProfileId}, 'appointment_completed', 'appointment', ${input.appointmentId}, ${JSON.stringify({ amount: input.amount, tip: input.tip, paymentMethod: input.paymentMethod })})
    `;
  });
}

export async function markAppointmentStatus(input: { appointmentId: string; staffId: string; actorProfileId: string; status: "no_show" | "cancelled" }) {
  if (!sql) throw new Error("Database is not configured.");
  await ensureInternalSchema();
  const rows = await sql`
    update appointments
    set status = ${input.status}
    where id = ${input.appointmentId} and staff_id = ${input.staffId}
    returning id::text
  `;
  if (!rows[0]) throw new Error("Not authorized for this appointment.");
  await sql`
    insert into audit_logs (user_id, action, entity_type, entity_id, metadata)
    values (${input.actorProfileId}, ${`appointment_${input.status}`}, 'appointment', ${input.appointmentId}, ${JSON.stringify({ status: input.status })})
  `;
}

export async function createExpense(input: { actorProfileId: string; category: string; description: string; amount: number; supplier: string; expenseDate: string }) {
  if (!sql) throw new Error("Database is not configured.");
  await ensureInternalSchema();
  const rows = await sql`
    insert into expenses (category, description, amount, expense_date, supplier, created_by)
    values (${input.category}, ${input.description}, ${input.amount}, ${input.expenseDate}, ${input.supplier}, ${input.actorProfileId})
    returning id::text
  `;
  await sql`
    insert into audit_logs (user_id, action, entity_type, entity_id, metadata)
    values (${input.actorProfileId}, 'expense_created', 'expense', ${rows[0].id}, ${JSON.stringify({ amount: input.amount, category: input.category })})
  `;
  return rows[0].id as string;
}

async function initializeInternalSchema() {
  if (!sql) return;
  await ensureBookingSchema();
  await sql`alter table staff add column if not exists hire_date date`;
  await sql`alter table customers add column if not exists birth_date date`;
  await sql`alter table appointments add column if not exists discount numeric not null default 0`;
  await sql`
    do $$ begin
      create type internal_role as enum ('staff', 'manager', 'admin');
    exception when duplicate_object then null;
    end $$
  `;
  await sql`
    create table if not exists profiles (
      id uuid primary key default gen_random_uuid(),
      auth_user_id text,
      first_name text not null,
      last_name text not null,
      email text unique not null,
      phone text,
      role internal_role not null,
      staff_id text references staff(id),
      password_hash text not null,
      active boolean not null default true,
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists transactions (
      id uuid primary key default gen_random_uuid(),
      appointment_id uuid references appointments(id),
      customer_id uuid references customers(id),
      staff_id text references staff(id),
      amount numeric not null default 0,
      discount numeric not null default 0,
      tip numeric not null default 0,
      payment_method text not null,
      payment_status text not null default 'paid',
      transaction_type text not null default 'service',
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists products (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      sku text unique,
      cost_price numeric not null default 0,
      sale_price numeric not null default 0,
      stock_quantity integer not null default 0,
      active boolean not null default true
    )
  `;
  await sql`
    create table if not exists product_sales (
      id uuid primary key default gen_random_uuid(),
      product_id uuid references products(id),
      staff_id text references staff(id),
      customer_id uuid references customers(id),
      appointment_id uuid references appointments(id),
      quantity integer not null,
      unit_price numeric not null,
      total_price numeric not null,
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists expenses (
      id uuid primary key default gen_random_uuid(),
      category text not null,
      description text not null,
      amount numeric not null,
      expense_date date not null,
      supplier text,
      created_by uuid references profiles(id),
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists staff_work_logs (
      id uuid primary key default gen_random_uuid(),
      staff_id text references staff(id),
      work_date date not null,
      clock_in timestamptz,
      clock_out timestamptz,
      break_minutes integer not null default 0,
      notes text
    )
  `;
  await sql`
    create table if not exists customer_notes (
      id uuid primary key default gen_random_uuid(),
      customer_id uuid references customers(id),
      staff_id text references staff(id),
      note text not null,
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists audit_logs (
      id uuid primary key default gen_random_uuid(),
      user_id uuid references profiles(id),
      action text not null,
      entity_type text not null,
      entity_id text,
      metadata jsonb not null default '{}',
      created_at timestamptz not null default now()
    )
  `;
  await seedInternalData();
}

async function seedInternalData() {
  if (!sql) return;
  const sophie = staff.find((person) => person.id === "sophie") ?? staff[0];
  await sql`
    insert into profiles (first_name, last_name, email, phone, role, staff_id, password_hash)
    values (${sophie.firstName}, ${sophie.lastName}, 'staff@maisonelegance.be', ${sophie.phone}, 'staff', ${sophie.id}, ${hashPassword("staff123")})
    on conflict (email) do update set role = excluded.role, staff_id = excluded.staff_id, password_hash = excluded.password_hash, active = true
  `;
  await sql`
    insert into profiles (first_name, last_name, email, phone, role, staff_id, password_hash)
    values ('Admin', 'Manager', 'admin@maisonelegance.be', '+32 2 468 18 55', 'admin', null, ${hashPassword("admin123")})
    on conflict (email) do update set role = excluded.role, staff_id = excluded.staff_id, password_hash = excluded.password_hash, active = true
  `;
  const transactionCount = await sql`select count(*)::int as count from transactions`;
  if (transactionCount[0]?.count) return;
  const completed = await sql`
    select id, customer_id, staff_id, price
    from appointments
    where status = 'completed'
  `;
  for (const appointment of completed) {
    await sql`
      insert into transactions (appointment_id, customer_id, staff_id, amount, discount, tip, payment_method, payment_status, transaction_type)
      values (${appointment.id}, ${appointment.customer_id}, ${appointment.staff_id}, ${appointment.price}, 0, 0, 'card', 'paid', 'service')
    `;
  }
}

async function getAppointments(filter: { staffId?: string }) {
  if (!sql) return [];
  const rows = filter.staffId
    ? await sql`
      select a.id::text as appointment_id, a.*, c.id::text as customer_id_text, c.first_name, c.last_name, c.email, c.phone, s.name as service_name, st.first_name as staff_first_name, st.last_name as staff_last_name
      from appointments a
      join customers c on c.id = a.customer_id
      join services s on s.id = a.service_id
      join staff st on st.id = a.staff_id
      where a.staff_id = ${filter.staffId}
      order by a.start_at asc
    `
    : await sql`
      select a.id::text as appointment_id, a.*, c.id::text as customer_id_text, c.first_name, c.last_name, c.email, c.phone, s.name as service_name, st.first_name as staff_first_name, st.last_name as staff_last_name
      from appointments a
      join customers c on c.id = a.customer_id
      join services s on s.id = a.service_id
      join staff st on st.id = a.staff_id
      order by a.start_at asc
    `;
  return rows.map(mapInternalAppointment);
}

async function getTransactions(filter: { staffId?: string }) {
  if (!sql) return [];
  return filter.staffId
    ? await sql`select * from transactions where staff_id = ${filter.staffId} order by created_at desc`
    : await sql`select * from transactions order by created_at desc`;
}

function calculateMetrics(appointments: InternalAppointment[], transactions: Record<string, unknown>[]): DashboardMetrics {
  const revenue = transactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const tips = transactions.reduce((sum, transaction) => sum + Number(transaction.tip), 0);
  return {
    appointments: appointments.length,
    completed: appointments.filter((appointment) => appointment.status === "completed").length,
    revenue,
    tips,
    averageTicket: transactions.length ? revenue / transactions.length : 0,
    cancelled: appointments.filter((appointment) => appointment.status === "cancelled").length,
    noShow: appointments.filter((appointment) => appointment.status === "no_show").length,
  };
}

function mapInternalAppointment(row: Record<string, unknown>): InternalAppointment {
  const start = new Date(row.start_at as Date);
  const end = new Date(row.end_at as Date);
  const startParts = brusselsParts(start);
  const endParts = brusselsParts(end);
  return {
    id: String(row.appointment_id),
    appointmentId: String(row.appointment_id),
    reference: String(row.booking_reference),
    customer: `${String(row.first_name)} ${String(row.last_name)}`,
    customerId: String(row.customer_id_text),
    customerFirstName: String(row.first_name),
    customerLastName: String(row.last_name),
    email: String(row.email),
    phone: String(row.phone),
    serviceId: String(row.service_id),
    serviceName: String(row.service_name),
    staffId: String(row.staff_id),
    staffFirstName: String(row.staff_first_name),
    staffLastName: String(row.staff_last_name),
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
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
}
