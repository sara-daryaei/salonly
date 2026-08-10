import { createSessionPayload, type InternalRole, type InternalSession } from "@/lib/internal-auth";
import { requireDatabase } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { canTransitionAppointment, validateExpenseInput, validatePaymentInput } from "@/lib/security-rules";
import { brusselsParts, getTodayBrussels } from "@/lib/time";
import { mergeStaffReportingRows } from "@/lib/reporting";
import type { Appointment } from "@/lib/salon-data";

export type InternalStaff = {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  photo: string;
  email: string;
  phone: string;
};

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

export type AuthResult = {
  session: InternalSession | null;
  profileId?: string;
  reason?: "invalid" | "disabled";
};

export type AdminDashboardData = Awaited<ReturnType<typeof getAdminDashboardData>>;
export type StaffDashboardData = Awaited<ReturnType<typeof getStaffDashboardData>>;

const fakeBcryptHash = "$2b$12$JY8ow7.Y38iDTf1KFKnaBu0L4p5sNMcTgSfGcqFmm2jFZ5Jm/tyqK";

export async function authenticateInternalUser(email: string, password: string): Promise<AuthResult> {
  const db = requireDatabase();
  const normalizedEmail = normalizeEmail(email);
  const rows = await db`
    select p.id::text, p.first_name, p.last_name, p.email, p.role::text, p.staff_id, p.password_hash, p.active,
      st.active as staff_active
    from profiles p
    left join staff st on st.id = p.staff_id
    where lower(p.email) = ${normalizedEmail}
    limit 1
  `;
  const user = rows[0];
  const passwordOk = await verifyPassword(password, String(user?.password_hash ?? fakeBcryptHash));
  if (!user || !passwordOk) return { session: null, reason: "invalid" };
  if (!user.active || (user.role === "staff" && !user.staff_active)) {
    return { session: null, profileId: String(user.id), reason: "disabled" };
  }

  return {
    session: createSessionPayload({
      profileId: String(user.id),
      email: String(user.email),
      role: user.role as InternalRole,
      staffId: user.staff_id ? String(user.staff_id) : null,
      name: `${String(user.first_name)} ${String(user.last_name)}`,
    }),
    profileId: String(user.id),
  };
}

export async function validateInternalSession(session: InternalSession | null, options?: { roles?: InternalRole[]; requireStaff?: boolean }) {
  if (!session) return null;
  const db = requireDatabase();
  const rows = await db`
    select p.id::text, p.first_name, p.last_name, p.email, p.role::text, p.staff_id, p.active,
      st.active as staff_active
    from profiles p
    left join staff st on st.id = p.staff_id
    where p.id = ${session.profileId}
    limit 1
  `;
  const profile = rows[0];
  if (!profile?.active) return null;
  const role = profile.role as InternalRole;
  if (options?.roles && !options.roles.includes(role)) return null;
  const staffId = profile.staff_id ? String(profile.staff_id) : null;
  if (options?.requireStaff && (!staffId || !profile.staff_active)) return null;

  return createSessionPayload({
    profileId: String(profile.id),
    email: String(profile.email),
    role,
    staffId,
    name: `${String(profile.first_name)} ${String(profile.last_name)}`,
  });
}

export async function recordAuditLog(input: { userId?: string | null; action: string; entityType: string; entityId?: string | null; metadata?: Record<string, unknown> }) {
  const db = requireDatabase();
  await db`
    insert into audit_logs (user_id, action, entity_type, entity_id, metadata)
    values (${input.userId ?? null}, ${input.action}, ${input.entityType}, ${input.entityId ?? null}, ${JSON.stringify(input.metadata ?? {})})
  `;
}

export async function getStaffDashboardData(staffId: string) {
  const [appointments, transactions, staffRows] = await Promise.all([
    getAppointments({ staffId }),
    getTransactions({ staffId }),
    getStaffRows({ staffId }),
  ]);
  const today = getTodayBrussels();
  const todaysAppointments = appointments.filter((appointment) => appointment.date === today);
  const todaysTransactions = transactions.filter((transaction) => brusselsParts(new Date(transaction.created_at as string)).date === today);
  const person = staffRows[0];
  return {
    staff: person,
    appointments,
    todaysAppointments,
    metrics: calculateMetrics(todaysAppointments, todaysTransactions),
    transactions,
  };
}

export async function getAdminDashboardData() {
  const db = requireDatabase();
  const [appointments, transactions, expenses, workLogs, revenueByStaff, revenueByService] = await Promise.all([
    getAppointments({}),
    getTransactions({}),
    db`select id::text, category, description, amount, expense_date::text, supplier, created_at::text from expenses order by expense_date desc, created_at desc`,
    db`select id::text, staff_id, work_date::text, clock_in::text, clock_out::text, break_minutes, notes from staff_work_logs order by work_date desc`,
    db`
      with appointment_stats as (
        select staff_id,
          count(*)::int as appointments,
          count(*) filter (where status = 'completed')::int as completed
        from appointments
        group by staff_id
      ),
      transaction_stats as (
        select staff_id,
          coalesce(sum(amount), 0)::numeric as revenue,
          coalesce(sum(tip), 0)::numeric as tips,
          count(*)::int as transaction_count
        from transactions
        where transaction_type = 'service'
        group by staff_id
      )
      select st.id as staff_id,
        st.first_name || ' ' || st.last_name as name,
        coalesce(a.appointments, 0)::int as appointments,
        coalesce(a.completed, 0)::int as completed,
        coalesce(t.revenue, 0)::numeric as revenue,
        coalesce(t.tips, 0)::numeric as tips,
        coalesce(t.transaction_count, 0)::int as transaction_count
      from staff st
      left join appointment_stats a on a.staff_id = st.id
      left join transaction_stats t on t.staff_id = st.id
      where st.active = true
      order by name
    `,
    db`
      select s.id as service_id, s.name,
        count(distinct a.id)::int as bookings,
        coalesce(sum(t.amount), 0)::numeric as revenue
      from services s
      left join appointments a on a.service_id = s.id
      left join transactions t on t.appointment_id = a.id and t.transaction_type = 'service'
      where s.active = true
      group by s.id, s.name
      having count(distinct a.id) > 0
      order by revenue desc, bookings desc
    `,
  ]);
  const metrics = calculateMetrics(appointments, transactions);
  const expenseTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  return {
    metrics,
    appointments,
    transactions,
    expenses,
    workLogs,
    revenueByStaff: mergeStaffReportingRows({
      staff: revenueByStaff.map((row) => ({ id: String(row.staff_id), name: String(row.name) })),
      appointmentStats: revenueByStaff.map((row) => ({
        staff_id: String(row.staff_id),
        appointments: Number(row.appointments),
        completed: Number(row.completed),
      })),
      transactionStats: revenueByStaff.map((row) => ({
        staff_id: String(row.staff_id),
        revenue: Number(row.revenue),
        tips: Number(row.tips),
        transaction_count: Number(row.transaction_count),
      })),
    }),
    revenueByService: revenueByService.map((row) => ({
      serviceId: String(row.service_id),
      name: String(row.name),
      bookings: Number(row.bookings),
      revenue: Number(row.revenue),
    })),
    operationalResult: metrics.revenue - expenseTotal,
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
  const payment = validatePaymentInput(input);
  if (!payment.ok) throw new ValidationError(payment.error);

  const db = requireDatabase();
  await db.begin(async (tx) => {
    const updated = await tx`
      update appointments
      set status = 'completed',
        notes = concat_ws(E'\n', nullif(notes, ''), nullif(${input.note ? `Service note: ${input.note}` : ""}, ''))
      where id = ${input.appointmentId}
        and staff_id = ${input.staffId}
        and status in ('pending', 'confirmed')
      returning id, customer_id, staff_id, service_id, status::text
    `;
    const appointment = updated[0];
    if (!appointment) throw new InvalidTransitionError("Appointment cannot be completed.");

    await tx`
      insert into transactions (appointment_id, customer_id, staff_id, amount, discount, tip, payment_method, payment_status, transaction_type)
      values (${input.appointmentId}, ${appointment.customer_id}, ${appointment.staff_id}, ${payment.amount}, ${payment.discount}, ${payment.tip}, ${payment.paymentMethod}, 'paid', 'service')
    `;
    if (input.note) {
      await tx`
        insert into customer_notes (customer_id, staff_id, note)
        values (${appointment.customer_id}, ${appointment.staff_id}, ${input.note})
      `;
    }
    await tx`
      insert into audit_logs (user_id, action, entity_type, entity_id, metadata)
      values (${input.actorProfileId}, 'appointment_completed', 'appointment', ${input.appointmentId}, ${JSON.stringify({ amount: payment.amount, tip: payment.tip, paymentMethod: payment.paymentMethod })})
    `;
  });
}

export async function markAppointmentStatus(input: { appointmentId: string; staffId: string; actorProfileId: string; status: "no_show" | "cancelled" }) {
  const db = requireDatabase();
  await db.begin(async (tx) => {
    const [appointment] = await tx`
      select id::text, status::text
      from appointments
      where id = ${input.appointmentId} and staff_id = ${input.staffId}
      for update
    `;
    if (!appointment) throw new ForbiddenError("Not authorized for this appointment.");
    if (!canTransitionAppointment(appointment.status as Appointment["status"], input.status)) {
      throw new InvalidTransitionError("Appointment status transition is not allowed.");
    }
    await tx`update appointments set status = ${input.status} where id = ${input.appointmentId}`;
    await tx`
      insert into audit_logs (user_id, action, entity_type, entity_id, metadata)
      values (${input.actorProfileId}, ${`appointment_${input.status}`}, 'appointment', ${input.appointmentId}, ${JSON.stringify({ status: input.status })})
    `;
  });
}

export async function createExpense(input: { actorProfileId: string; category: string; description: string; amount: number; supplier: string; expenseDate: string }) {
  const validation = validateExpenseInput(input);
  if (!validation.ok) throw new ValidationError(validation.error);
  const db = requireDatabase();
  const rows = await db`
    insert into expenses (category, description, amount, expense_date, supplier, created_by)
    values (${validation.category}, ${validation.description}, ${validation.amount}, ${validation.expenseDate}, ${validation.supplier}, ${input.actorProfileId})
    returning id::text
  `;
  await recordAuditLog({
    userId: input.actorProfileId,
    action: "expense_created",
    entityType: "expense",
    entityId: String(rows[0].id),
    metadata: { amount: validation.amount, category: validation.category },
  });
  return rows[0].id as string;
}

async function getAppointments(filter: { staffId?: string }) {
  const db = requireDatabase();
  const rows = filter.staffId
    ? await db`
      select a.id::text as appointment_id, a.*, c.id::text as customer_id_text, c.first_name, c.last_name, c.email, c.phone, s.name as service_name, st.first_name as staff_first_name, st.last_name as staff_last_name
      from appointments a
      join customers c on c.id = a.customer_id
      join services s on s.id = a.service_id
      join staff st on st.id = a.staff_id
      where a.staff_id = ${filter.staffId}
      order by a.start_at asc
    `
    : await db`
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
  const db = requireDatabase();
  return filter.staffId
    ? await db`select id::text, appointment_id::text, customer_id::text, staff_id, amount, discount, tip, payment_method, payment_status, transaction_type, created_at::text from transactions where staff_id = ${filter.staffId} order by created_at desc`
    : await db`select id::text, appointment_id::text, customer_id::text, staff_id, amount, discount, tip, payment_method, payment_status, transaction_type, created_at::text from transactions order by created_at desc`;
}

async function getStaffRows(filter: { staffId?: string }) {
  const db = requireDatabase();
  const rows = filter.staffId
    ? await db`select id, first_name, last_name, job_title, photo_url, email, phone from staff where id = ${filter.staffId} and active = true`
    : await db`select id, first_name, last_name, job_title, photo_url, email, phone from staff where active = true order by first_name`;
  return rows.map((row) => ({
    id: String(row.id),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    title: String(row.job_title),
    photo: String(row.photo_url ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
  }));
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

export class ValidationError extends Error {}
export class ForbiddenError extends Error {}
export class InvalidTransitionError extends Error {}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
