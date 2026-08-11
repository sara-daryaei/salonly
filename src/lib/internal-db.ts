import { createSessionPayload, type InternalRole, type InternalSession } from "@/lib/internal-auth";
import type { TransactionSql } from "postgres";
import { requireDatabase } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { canTransitionAppointment, validateExpenseInput, validatePaymentInput } from "@/lib/security-rules";
import { brusselsParts, getTodayBrussels } from "@/lib/time";
import { listAppointments, type InternalAppointmentRecord } from "@/lib/internal/appointments";
import { listExpenses } from "@/lib/internal/expenses";
import { listStaff } from "@/lib/internal/staff";
import { listTransactions } from "@/lib/internal/payments";
import { getServiceRevenueReport, getStaffRevenueReport } from "@/lib/internal/reports";
import { listActiveProducts, listProductSales } from "@/lib/internal/products";
import { getTodayWorkLog } from "@/lib/internal/work-logs";
import type { Appointment } from "@/lib/salon-data";
import { buildBookingReference } from "@/lib/availability";
import { AppointmentConflictError, brusselsDateTimeToUtc, validateDatabaseBookingRequest } from "@/lib/booking-db";

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
  const [appointments, transactions, staffRows, products, workLog, productSales] = await Promise.all([
    listAppointments({ staffId }),
    listTransactions({ staffId }),
    listStaff({ staffId }),
    listActiveProducts(),
    getTodayWorkLog(staffId),
    listProductSales({ staffId, dateFrom: getTodayBrussels(), dateTo: getTodayBrussels() }),
  ]);
  const today = getTodayBrussels();
  const todaysAppointments = appointments.filter((appointment) => appointment.date === today);
  const todaysTransactions = transactions.filter((transaction) => brusselsParts(new Date(transaction.created_at as string)).date === today);
  const nextAppointment = appointments.find((appointment) => ["confirmed", "in_progress"].includes(appointment.status) && appointment.date >= today) ?? null;
  const person = staffRows[0];
  return {
    staff: person,
    appointments,
    todaysAppointments,
    nextAppointment,
    metrics: calculateMetrics(todaysAppointments, todaysTransactions),
    transactions,
    products,
    workLog,
    productSales,
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
  grossAmount: number;
  discount: number;
  tip: number;
  paymentMethod: string;
  note: string;
  products?: { productId: string; quantity: number }[];
}) {
  const payment = validatePaymentInput(input);
  if (!payment.ok) throw new ValidationError(payment.error);

  const db = requireDatabase();
  await db.begin(async (tx) => {
    const [appointment] = await tx`
      select id::text, customer_id, staff_id, service_id, status::text
      from appointments
      where id = ${input.appointmentId}
        and staff_id = ${input.staffId}
      for update
    `;
    if (!appointment) throw new ForbiddenError("Not authorized for this appointment.");
    if (!canTransitionAppointment(appointment.status as Appointment["status"], "completed")) {
      throw new InvalidTransitionError("Appointment cannot be completed.");
    }
    await tx`
      update appointments
      set status = 'completed',
        notes = concat_ws(E'\n', nullif(notes, ''), nullif(${input.note ? `Service note: ${input.note}` : ""}, ''))
      where id = ${input.appointmentId}
    `;

    await tx`
      insert into transactions (appointment_id, customer_id, staff_id, amount, discount, tip, payment_method, payment_status, transaction_type)
      values (${input.appointmentId}, ${appointment.customer_id}, ${appointment.staff_id}, ${payment.netAmount}, ${payment.discount}, ${payment.tip}, ${payment.paymentMethod}, 'paid', 'service')
    `;
    for (const product of input.products ?? []) {
      await sellProductInTransaction(tx, {
        appointmentId: input.appointmentId,
        staffId: input.staffId,
        customerId: String(appointment.customer_id),
        productId: product.productId,
        quantity: product.quantity,
      });
    }
    if (input.note) {
      await tx`
        insert into customer_notes (customer_id, staff_id, note)
        values (${appointment.customer_id}, ${appointment.staff_id}, ${input.note})
      `;
    }
    await tx`
      insert into audit_logs (user_id, action, entity_type, entity_id, metadata)
      values (${input.actorProfileId}, 'appointment_completed', 'appointment', ${input.appointmentId}, ${JSON.stringify({ grossAmount: payment.grossAmount, netAmount: payment.netAmount, discount: payment.discount, tip: payment.tip, paymentMethod: payment.paymentMethod })})
    `;
  });
}

export async function startAppointment(input: { appointmentId: string; staffId: string; actorProfileId: string }) {
  const db = requireDatabase();
  await db.begin(async (tx) => {
    const [appointment] = await tx`
      select id::text, status::text
      from appointments
      where id = ${input.appointmentId} and staff_id = ${input.staffId}
      for update
    `;
    if (!appointment) throw new ForbiddenError("Not authorized for this appointment.");
    if (!canTransitionAppointment(appointment.status as Appointment["status"], "in_progress")) {
      throw new InvalidTransitionError("Appointment cannot be started.");
    }
    await tx`update appointments set status = 'in_progress' where id = ${input.appointmentId}`;
    await tx`
      insert into audit_logs (user_id, action, entity_type, entity_id, metadata)
      values (${input.actorProfileId}, 'appointment_started', 'appointment', ${input.appointmentId}, '{}'::jsonb)
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

export async function addStaffAppointmentNote(input: { appointmentId: string; staffId: string; actorProfileId: string; note: string; customerNote?: boolean }) {
  const note = input.note.trim();
  if (!note) throw new ValidationError("Note is required.");
  const db = requireDatabase();
  await db.begin(async (tx) => {
    const [appointment] = await tx`
      select id::text, customer_id
      from appointments
      where id = ${input.appointmentId} and staff_id = ${input.staffId}
      for update
    `;
    if (!appointment) throw new ForbiddenError("Not authorized for this appointment.");
    await tx`
      update appointments
      set notes = concat_ws(E'\n', nullif(notes, ''), ${`Staff note: ${note}`}::text)
      where id = ${input.appointmentId}
    `;
    if (input.customerNote) {
      await tx`
        insert into customer_notes (customer_id, staff_id, note)
        values (${appointment.customer_id}, ${input.staffId}, ${note})
      `;
    }
    await tx`
      insert into audit_logs (user_id, action, entity_type, entity_id, metadata)
      values (${input.actorProfileId}, 'appointment_note_added', 'appointment', ${input.appointmentId}, ${JSON.stringify({ customerNote: Boolean(input.customerNote) })})
    `;
  });
}

export async function sellAppointmentProduct(input: { appointmentId: string; staffId: string; actorProfileId: string; productId: string; quantity: number }) {
  const db = requireDatabase();
  await db.begin(async (tx) => {
    const [appointment] = await tx`
      select id::text, customer_id::text
      from appointments
      where id = ${input.appointmentId} and staff_id = ${input.staffId}
      for update
    `;
    if (!appointment) throw new ForbiddenError("Not authorized for this appointment.");
    await sellProductInTransaction(tx, {
      appointmentId: input.appointmentId,
      staffId: input.staffId,
      customerId: String(appointment.customer_id),
      productId: input.productId,
      quantity: input.quantity,
    });
    await tx`
      insert into audit_logs (user_id, action, entity_type, entity_id, metadata)
      values (${input.actorProfileId}, 'product_sold', 'appointment', ${input.appointmentId}, ${JSON.stringify({ productId: input.productId, quantity: input.quantity })})
    `;
  });
}

export async function scheduleStaffNextAppointment(input: {
  customerId: string;
  staffId: string;
  actorProfileId: string;
  serviceId: string;
  date: string;
  startTime: string;
  notes?: string;
}) {
  const db = requireDatabase();
  const validation = await validateDatabaseBookingRequest({
    serviceId: input.serviceId,
    staffId: input.staffId,
    date: input.date,
    startTime: input.startTime,
  });
  if (!validation.ok) throw new ValidationError(validation.error);

  try {
    await db.begin(async (tx) => {
      const [customer] = await tx`
        select c.id
        from customers c
        where c.id = ${input.customerId}
          and exists (
            select 1 from appointments a
            where a.customer_id = c.id and a.staff_id = ${input.staffId}
          )
        limit 1
      `;
      if (!customer) throw new ForbiddenError("Not authorized for this customer.");

      const reference = buildBookingReference(input.date);
      const startAt = brusselsDateTimeToUtc(input.date, input.startTime);
      const endAt = brusselsDateTimeToUtc(input.date, validation.endTime);
      const [appointment] = await tx`
        insert into appointments (booking_reference, customer_id, service_id, staff_id, start_at, end_at, duration, price, status, notes)
        values (${reference}, ${input.customerId}, ${validation.service.id}, ${input.staffId}, ${startAt.toISOString()}, ${endAt.toISOString()}, ${validation.service.duration}, ${validation.service.price}, 'confirmed', ${input.notes || "Scheduled by staff."})
        returning id::text, booking_reference
      `;
      await tx`
        insert into audit_logs (user_id, action, entity_type, entity_id, metadata)
        values (${input.actorProfileId}, 'staff_next_appointment_scheduled', 'appointment', ${appointment.id}, ${JSON.stringify({ customerId: input.customerId, serviceId: input.serviceId })})
      `;
    });
  } catch (error) {
    if (isExclusionViolation(error)) throw new AppointmentConflictError();
    throw error;
  }
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

async function sellProductInTransaction(tx: TransactionSql<Record<string, never>>, input: { appointmentId: string; staffId: string; customerId: string; productId: string; quantity: number }) {
  const quantity = Number(input.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) throw new ValidationError("Product quantity must be a positive whole number.");
  const [product] = await tx`
    update products
    set stock_quantity = stock_quantity - ${quantity}
    where id = ${input.productId}
      and active = true
      and stock_quantity >= ${quantity}
    returning id::text, sale_price
  `;
  if (!product) throw new InvalidTransitionError("Product is unavailable or does not have enough stock.");
  const unitPrice = Number(product.sale_price);
  const totalPrice = unitPrice * quantity;
  await tx`
    insert into product_sales (product_id, staff_id, customer_id, appointment_id, quantity, unit_price, total_price)
    values (${input.productId}, ${input.staffId}, ${input.customerId}, ${input.appointmentId}, ${quantity}, ${unitPrice}, ${totalPrice})
  `;
}

function calculateMetrics(appointments: InternalAppointment[], transactions: Record<string, unknown>[]): DashboardMetrics {
  const serviceTransactions = transactions.filter((transaction) => transaction.transaction_type === "service" && transaction.payment_status === "paid");
  const revenue = serviceTransactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const tips = serviceTransactions.reduce((sum, transaction) => sum + Number(transaction.tip), 0);
  return {
    appointments: appointments.length,
    completed: appointments.filter((appointment) => appointment.status === "completed").length,
    revenue,
    tips,
    averageTicket: serviceTransactions.length ? revenue / serviceTransactions.length : 0,
    cancelled: appointments.filter((appointment) => appointment.status === "cancelled").length,
    noShow: appointments.filter((appointment) => appointment.status === "no_show").length,
  };
}

export class ValidationError extends Error {}
export class ForbiddenError extends Error {}
export class InvalidTransitionError extends Error {}

function isExclusionViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23P01";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
