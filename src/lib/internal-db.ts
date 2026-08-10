import { createSessionPayload, type InternalRole, type InternalSession } from "@/lib/internal-auth";
import { requireDatabase } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { canTransitionAppointment, validateExpenseInput, validatePaymentInput } from "@/lib/security-rules";
import { brusselsParts, getTodayBrussels } from "@/lib/time";
import { listAppointments, type InternalAppointmentRecord } from "@/lib/internal/appointments";
import { listExpenses } from "@/lib/internal/expenses";
import { listStaff } from "@/lib/internal/staff";
import { listTransactions } from "@/lib/internal/payments";
import { getServiceRevenueReport, getStaffRevenueReport } from "@/lib/internal/reports";
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

export type InternalAppointment = InternalAppointmentRecord;

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
    listAppointments({ staffId }),
    listTransactions({ staffId }),
    listStaff({ staffId }),
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
    listAppointments({}),
    listTransactions({}),
    listExpenses(),
    db`select id::text, staff_id, work_date::text, clock_in::text, clock_out::text, break_minutes, notes from staff_work_logs order by work_date desc`,
    getStaffRevenueReport(),
    getServiceRevenueReport(),
  ]);
  const metrics = calculateMetrics(appointments, transactions);
  const expenseTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  return {
    metrics,
    appointments,
    transactions,
    expenses,
    workLogs,
    revenueByStaff,
    revenueByService,
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

export class ValidationError extends Error {}
export class ForbiddenError extends Error {}
export class InvalidTransitionError extends Error {}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
