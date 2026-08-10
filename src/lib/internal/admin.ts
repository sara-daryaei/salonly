import { revalidatePath } from "next/cache";
import type { TransactionSql } from "postgres";
import { apiError } from "@/lib/api-response";
import { brusselsDateTimeToUtc } from "@/lib/booking-db";
import { requireDatabase } from "@/lib/db";
import type { InternalSession } from "@/lib/internal-auth";
import { recordAuditLog, ValidationError } from "@/lib/internal-db";
import type { AppointmentStatus } from "@/lib/salon-data";
import { brusselsParts, getTodayBrussels } from "@/lib/time";

export type DateRange = { from: string; to: string; label: string };

export function getAdminRange(searchParams?: { [key: string]: string | string[] | undefined }): DateRange {
  const today = getTodayBrussels();
  const period = value(searchParams?.period) || "today";
  if (period === "custom") {
    return { from: validDate(value(searchParams?.from)) || today, to: validDate(value(searchParams?.to)) || today, label: "Custom range" };
  }
  if (period === "7d") return { from: addDays(today, -6), to: today, label: "7 days" };
  if (period === "30d") return { from: addDays(today, -29), to: today, label: "30 days" };
  if (period === "month") return { from: `${today.slice(0, 7)}-01`, to: today, label: "This month" };
  return { from: today, to: today, label: "Today" };
}

export async function listAdminOverview(range: DateRange) {
  const db = requireDatabase();
  const [appointments, transactions, productSales, expenses, customers] = await Promise.all([
    db`
      select a.id::text, a.status::text, a.price, a.start_at, a.created_at, c.id::text as customer_id
      from appointments a
      join customers c on c.id = a.customer_id
      where a.start_at >= (${range.from}::date at time zone 'Europe/Brussels')
        and a.start_at < (((${range.to}::date + interval '1 day') at time zone 'Europe/Brussels'))
    `,
    db`
      select amount, discount, tip, transaction_type
      from transactions
      where created_at >= (${range.from}::date at time zone 'Europe/Brussels')
        and created_at < (((${range.to}::date + interval '1 day') at time zone 'Europe/Brussels'))
        and payment_status = 'paid'
    `,
    db`
      select total_price
      from product_sales
      where created_at >= (${range.from}::date at time zone 'Europe/Brussels')
        and created_at < (((${range.to}::date + interval '1 day') at time zone 'Europe/Brussels'))
    `,
    db`
      select amount
      from expenses
      where expense_date >= ${range.from}::date and expense_date <= ${range.to}::date
    `,
    db`
      select c.id::text,
        min(a.start_at)::date as first_visit,
        bool_or(a.start_at >= (${range.from}::date at time zone 'Europe/Brussels') and a.start_at < (((${range.to}::date + interval '1 day') at time zone 'Europe/Brussels'))) as in_period
      from customers c
      join appointments a on a.customer_id = c.id
      group by c.id
    `,
  ]);
  const serviceRevenue = transactions.filter((row) => row.transaction_type === "service").reduce((sum, row) => sum + Number(row.amount), 0);
  const tips = transactions.reduce((sum, row) => sum + Number(row.tip), 0);
  const productRevenue = productSales.reduce((sum, row) => sum + Number(row.total_price), 0);
  const expenseTotal = expenses.reduce((sum, row) => sum + Number(row.amount), 0);
  const appointmentCount = appointments.length;
  const completed = appointments.filter((row) => row.status === "completed").length;
  const periodCustomers = customers.filter((row) => row.in_period);
  return {
    serviceRevenue,
    productRevenue,
    tips,
    expenses: expenseTotal,
    operationalResult: serviceRevenue + productRevenue + tips - expenseTotal,
    appointments: appointmentCount,
    completed,
    cancelled: appointments.filter((row) => row.status === "cancelled").length,
    noShows: appointments.filter((row) => row.status === "no_show").length,
    newCustomers: periodCustomers.filter((row) => String(row.first_visit) >= range.from && String(row.first_visit) <= range.to).length,
    returningCustomers: periodCustomers.filter((row) => String(row.first_visit) < range.from).length,
    averageTicket: completed ? (serviceRevenue + productRevenue) / completed : 0,
  };
}

export async function listAdminAppointments(filter: { q?: string; from?: string; to?: string; status?: string; staffId?: string; serviceId?: string } = {}) {
  const db = requireDatabase();
  return db`
    select a.id::text, a.booking_reference, a.status::text, a.start_at::text, a.end_at::text, a.duration, a.price, a.notes,
      c.id::text as customer_id, c.first_name || ' ' || c.last_name as customer, c.email, c.phone,
      st.id as staff_id, st.first_name || ' ' || st.last_name as staff,
      s.id as service_id, s.name as service
    from appointments a
    join customers c on c.id = a.customer_id
    join staff st on st.id = a.staff_id
    join services s on s.id = a.service_id
    where (${filter.q ?? null}::text is null or c.first_name ilike ${like(filter.q)} or c.last_name ilike ${like(filter.q)} or c.email ilike ${like(filter.q)} or c.phone ilike ${like(filter.q)} or a.booking_reference ilike ${like(filter.q)})
      and (${filter.from ?? null}::text is null or a.start_at >= (${filter.from ?? null}::date at time zone 'Europe/Brussels'))
      and (${filter.to ?? null}::text is null or a.start_at < (((${filter.to ?? null}::date + interval '1 day') at time zone 'Europe/Brussels')))
      and (${filter.status ?? null}::text is null or a.status::text = ${filter.status ?? null})
      and (${filter.staffId ?? null}::text is null or a.staff_id = ${filter.staffId ?? null})
      and (${filter.serviceId ?? null}::text is null or a.service_id = ${filter.serviceId ?? null})
    order by a.start_at desc
  `;
}

export async function listAdminCustomers(filter: { q?: string } = {}) {
  const db = requireDatabase();
  return db`
    select c.id::text, c.first_name, c.last_name, c.email, c.phone, c.notes, c.created_at::text,
      count(a.id)::int as appointments,
      coalesce(sum(t.amount), 0)::numeric + coalesce((select sum(ps.total_price) from product_sales ps where ps.customer_id = c.id), 0)::numeric as total_spend,
      max(a.start_at) filter (where a.start_at <= now())::text as last_visit,
      min(a.start_at) filter (where a.start_at > now() and a.status in ('pending','confirmed','in_progress'))::text as next_appointment,
      count(a.id) filter (where a.status = 'no_show')::int as no_show_count,
      count(a.id) filter (where a.status = 'cancelled')::int as cancellation_count
    from customers c
    left join appointments a on a.customer_id = c.id
    left join transactions t on t.customer_id = c.id and t.payment_status = 'paid'
    where (${filter.q ?? null}::text is null or c.first_name ilike ${like(filter.q)} or c.last_name ilike ${like(filter.q)} or c.email ilike ${like(filter.q)} or c.phone ilike ${like(filter.q)})
    group by c.id
    order by last_visit desc nulls last, c.created_at desc
  `;
}

export async function getAdminCustomer(customerId: string) {
  const db = requireDatabase();
  const [customer] = await db`
    select c.id::text, c.first_name, c.last_name, c.email, c.phone, c.notes, c.created_at::text,
      count(a.id)::int as appointments,
      coalesce(sum(t.amount), 0)::numeric + coalesce((select sum(ps.total_price) from product_sales ps where ps.customer_id = c.id), 0)::numeric as total_spend,
      max(a.start_at) filter (where a.start_at <= now())::text as last_visit,
      min(a.start_at) filter (where a.start_at > now() and a.status in ('pending','confirmed','in_progress'))::text as next_appointment,
      count(a.id) filter (where a.status = 'no_show')::int as no_show_count,
      count(a.id) filter (where a.status = 'cancelled')::int as cancellation_count
    from customers c
    left join appointments a on a.customer_id = c.id
    left join transactions t on t.customer_id = c.id and t.payment_status = 'paid'
    where c.id = ${customerId}
    group by c.id
    limit 1
  `;
  const appointments = await db`
    select a.id::text, a.booking_reference, a.status::text, a.start_at::text, a.end_at::text, a.price,
      st.first_name || ' ' || st.last_name as staff, s.name as service
    from appointments a
    join staff st on st.id = a.staff_id
    join services s on s.id = a.service_id
    where a.customer_id = ${customerId}
    order by a.start_at desc
  `;
  const notes = await db`
    select id::text, note, created_at::text
    from customer_notes
    where customer_id = ${customerId}
    order by created_at desc
  `;
  return customer ? { customer, appointments, notes } : null;
}

export async function listAdminStaff() {
  const db = requireDatabase();
  return db`
    select st.id, st.first_name, st.last_name, st.job_title, st.email, st.phone, st.active,
      coalesce(array_agg(distinct ss.service_id) filter (where ss.service_id is not null), '{}') as service_ids,
      coalesce(json_agg(distinct jsonb_build_object('day', wh.day_of_week, 'start', wh.start_time::text, 'end', wh.end_time::text, 'lunchStart', wh.lunch_start::text, 'lunchEnd', wh.lunch_end::text, 'active', wh.active)) filter (where wh.id is not null), '[]') as working_hours
    from staff st
    left join staff_services ss on ss.staff_id = st.id
    left join staff_working_hours wh on wh.staff_id = st.id
    group by st.id
    order by st.first_name
  `;
}

export async function listInternalAccounts() {
  const db = requireDatabase();
  return db`
    select p.id::text, p.first_name, p.last_name, p.email, p.phone, p.role::text, p.staff_id, p.active
    from profiles p
    where p.role in ('manager', 'admin')
    order by p.role, p.email
  `;
}

export async function listAdminServices() {
  const db = requireDatabase();
  return db`
    select s.*, coalesce(array_agg(ss.staff_id) filter (where ss.staff_id is not null), '{}') as staff_ids,
      count(a.id)::int as appointment_count
    from services s
    left join staff_services ss on ss.service_id = s.id
    left join appointments a on a.service_id = s.id
    group by s.id
    order by s.category, s.name
  `;
}

export async function listAdminPayments(filter: { from?: string; to?: string; staffId?: string; method?: string } = {}) {
  const db = requireDatabase();
  return db`
    select t.id::text, t.created_at::text, t.amount, t.discount, t.tip, t.payment_method, t.payment_status, t.transaction_type,
      a.id::text as appointment_id, a.booking_reference, c.first_name || ' ' || c.last_name as customer,
      st.first_name || ' ' || st.last_name as staff, s.name as service,
      coalesce((select sum(ps.total_price) from product_sales ps where ps.appointment_id = a.id), 0)::numeric as products
    from transactions t
    left join appointments a on a.id = t.appointment_id
    left join customers c on c.id = t.customer_id
    left join staff st on st.id = t.staff_id
    left join services s on s.id = a.service_id
    where (${filter.from ?? null}::text is null or t.created_at >= (${filter.from ?? null}::date at time zone 'Europe/Brussels'))
      and (${filter.to ?? null}::text is null or t.created_at < (((${filter.to ?? null}::date + interval '1 day') at time zone 'Europe/Brussels')))
      and (${filter.staffId ?? null}::text is null or t.staff_id = ${filter.staffId ?? null})
      and (${filter.method ?? null}::text is null or t.payment_method = ${filter.method ?? null})
    order by t.created_at desc
  `;
}

export async function listAdminReports(range: DateRange) {
  const db = requireDatabase();
  const fromSql = range.from;
  const toSql = range.to;
  const [staffRevenue, serviceRevenue, methodRevenue, statusCounts, expenses, products, retention] = await Promise.all([
    db`select st.first_name || ' ' || st.last_name as label, coalesce(sum(t.amount),0)::numeric as value from staff st left join transactions t on t.staff_id = st.id and t.created_at >= (${fromSql}::date at time zone 'Europe/Brussels') and t.created_at < (((${toSql}::date + interval '1 day') at time zone 'Europe/Brussels')) and t.payment_status = 'paid' group by st.id order by value desc`,
    db`select s.name as label, coalesce(sum(t.amount),0)::numeric as value from services s left join appointments a on a.service_id = s.id left join transactions t on t.appointment_id = a.id and t.created_at >= (${fromSql}::date at time zone 'Europe/Brussels') and t.created_at < (((${toSql}::date + interval '1 day') at time zone 'Europe/Brussels')) and t.payment_status = 'paid' group by s.id order by value desc`,
    db`select payment_method as label, coalesce(sum(amount),0)::numeric as value from transactions where created_at >= (${fromSql}::date at time zone 'Europe/Brussels') and created_at < (((${toSql}::date + interval '1 day') at time zone 'Europe/Brussels')) group by payment_method order by value desc`,
    db`select status::text as label, count(*)::int as value from appointments where start_at >= (${fromSql}::date at time zone 'Europe/Brussels') and start_at < (((${toSql}::date + interval '1 day') at time zone 'Europe/Brussels')) group by status order by value desc`,
    db`select category as label, coalesce(sum(amount),0)::numeric as value from expenses where expense_date >= ${fromSql}::date and expense_date <= ${toSql}::date group by category order by value desc`,
    db`select p.name as label, coalesce(sum(ps.total_price),0)::numeric as value from products p left join product_sales ps on ps.product_id = p.id and ps.created_at >= (${fromSql}::date at time zone 'Europe/Brussels') and ps.created_at < (((${toSql}::date + interval '1 day') at time zone 'Europe/Brussels')) group by p.id order by value desc`,
    db`select case when visits > 1 then 'Returning customers' else 'First visit customers' end as label, count(*)::int as value from (select customer_id, count(*) as visits from appointments where start_at < (((${toSql}::date + interval '1 day') at time zone 'Europe/Brussels')) group by customer_id) r group by label`,
  ]);
  return { staffRevenue, serviceRevenue, methodRevenue, statusCounts, expenses, products, retention };
}

export async function updateAppointment(input: {
  actor: InternalSession;
  appointmentId: string;
  status?: AppointmentStatus;
  staffId?: string;
  serviceId?: string;
  date?: string;
  time?: string;
  notes?: string;
}) {
  const db = requireDatabase();
  await db.begin(async (tx) => {
    const [current] = await tx`select * from appointments where id = ${input.appointmentId} for update`;
    if (!current) throw new ValidationError("Appointment not found.");
    const serviceId = input.serviceId || String(current.service_id);
    const staffId = input.staffId || String(current.staff_id);
    const [service] = await tx`select id, duration, price, active from services where id = ${serviceId}`;
    if (!service?.active) throw new ValidationError("Selected service is not active.");
    await assertBookableWindow(tx, {
      appointmentId: input.appointmentId,
      serviceId,
      staffId,
      date: input.date || brusselsParts(new Date(current.start_at as Date)).date,
      time: input.time || brusselsParts(new Date(current.start_at as Date)).time,
      duration: Number(service.duration),
      status: input.status || (current.status as AppointmentStatus),
    });
    const startAt = brusselsDateTimeToUtc(input.date || brusselsParts(new Date(current.start_at as Date)).date, input.time || brusselsParts(new Date(current.start_at as Date)).time);
    const endAt = new Date(startAt.getTime() + Number(service.duration) * 60000);
    await tx`
      update appointments set
        status = ${input.status ?? current.status},
        staff_id = ${staffId},
        service_id = ${serviceId},
        start_at = ${startAt.toISOString()},
        end_at = ${endAt.toISOString()},
        duration = ${Number(service.duration)},
        price = ${Number(service.price)},
        notes = ${input.notes ?? current.notes}
      where id = ${input.appointmentId}
    `;
    await tx`insert into audit_logs (user_id, action, entity_type, entity_id, metadata) values (${input.actor.profileId}, 'admin_appointment_updated', 'appointment', ${input.appointmentId}, ${JSON.stringify({ status: input.status, staffId, serviceId })})`;
  });
  refreshAdmin();
}

export async function upsertService(actor: InternalSession, body: Record<string, unknown>, serviceId?: string) {
  const db = requireDatabase();
  const id = serviceId || slug(String(body.name ?? ""));
  const staffIds = array(body.staffIds);
  const active = Boolean(body.active);
  await db.begin(async (tx) => {
    await tx`
      insert into services (id, name, category, description, price, duration, image_url, active)
      values (${id}, ${text(body.name)}, ${text(body.category)}, ${text(body.description)}, ${num(body.price)}, ${num(body.duration)}, ${text(body.imageUrl)}, ${active})
      on conflict (id) do update set name = excluded.name, category = excluded.category, description = excluded.description, price = excluded.price, duration = excluded.duration, image_url = excluded.image_url, active = excluded.active
    `;
    await tx`delete from staff_services where service_id = ${id}`;
    for (const staffId of staffIds) await tx`insert into staff_services (staff_id, service_id) values (${staffId}, ${id}) on conflict do nothing`;
    await tx`insert into audit_logs (user_id, action, entity_type, entity_id, metadata) values (${actor.profileId}, ${serviceId ? "service_updated" : "service_created"}, 'service', ${id}, ${JSON.stringify({ active })})`;
  });
  refreshAdmin();
  return id;
}

export async function upsertProduct(actor: InternalSession, body: Record<string, unknown>, productId?: string) {
  const db = requireDatabase();
  const rows = productId
    ? await db`
      update products set name = ${text(body.name)}, sku = ${nullable(body.sku)}, cost_price = ${num(body.costPrice)}, sale_price = ${num(body.salePrice)}, stock_quantity = ${int(body.stock)}, active = ${Boolean(body.active)}, updated_at = now()
      where id = ${productId}
      returning id::text
    `
    : await db`
      insert into products (name, sku, cost_price, sale_price, stock_quantity, active, updated_at)
      values (${text(body.name)}, ${nullable(body.sku)}, ${num(body.costPrice)}, ${num(body.salePrice)}, ${int(body.stock)}, ${Boolean(body.active)}, now())
      returning id::text
    `;
  await recordAuditLog({ userId: actor.profileId, action: productId ? "product_updated" : "product_created", entityType: "product", entityId: String(rows[0].id) });
  refreshAdmin();
  return rows[0].id as string;
}

export async function adjustProductStock(actor: InternalSession, productId: string, delta: number, reason: string) {
  const db = requireDatabase();
  await db.begin(async (tx) => {
    const [before] = await tx`select stock_quantity from products where id = ${productId} for update`;
    if (!before) throw new ValidationError("Product not found.");
    const after = Number(before.stock_quantity) + delta;
    if (after < 0) throw new ValidationError("Stock cannot become negative.");
    await tx`update products set stock_quantity = ${after}, updated_at = now() where id = ${productId}`;
    await tx`insert into product_inventory_audit (product_id, changed_by, quantity_before, quantity_after, delta, reason) values (${productId}, ${actor.profileId}, ${Number(before.stock_quantity)}, ${after}, ${delta}, ${reason || "Manual adjustment"})`;
  });
  refreshAdmin();
}

export async function upsertStaff(actor: InternalSession, body: Record<string, unknown>, staffId?: string) {
  const db = requireDatabase();
  const id = staffId || slug(`${String(body.firstName)}-${String(body.lastName)}`);
  await db.begin(async (tx) => {
    await tx`
      insert into staff (id, first_name, last_name, job_title, bio, phone, email, active)
      values (${id}, ${text(body.firstName)}, ${text(body.lastName)}, ${text(body.jobTitle)}, ${text(body.bio) || "Team member."}, ${nullable(body.phone)}, ${nullable(body.email)}, ${Boolean(body.active)})
      on conflict (id) do update set first_name = excluded.first_name, last_name = excluded.last_name, job_title = excluded.job_title, bio = excluded.bio, phone = excluded.phone, email = excluded.email, active = excluded.active
    `;
    await tx`delete from staff_services where staff_id = ${id}`;
    for (const serviceId of array(body.serviceIds)) await tx`insert into staff_services (staff_id, service_id) values (${id}, ${serviceId}) on conflict do nothing`;
    await tx`insert into audit_logs (user_id, action, entity_type, entity_id, metadata) values (${actor.profileId}, ${staffId ? "staff_updated" : "staff_created"}, 'staff', ${id}, ${JSON.stringify({ active: Boolean(body.active) })})`;
  });
  refreshAdmin();
  return id;
}

export async function replaceStaffSchedule(actor: InternalSession, staffId: string, schedules: Record<string, unknown>[]) {
  const db = requireDatabase();
  await db.begin(async (tx) => {
    await tx`delete from staff_working_hours where staff_id = ${staffId}`;
    for (const row of schedules) {
      const active = Boolean(row.active);
      if (!active) continue;
      await tx`
        insert into staff_working_hours (staff_id, day_of_week, start_time, end_time, lunch_start, lunch_end, active)
        values (${staffId}, ${int(row.day)}, ${text(row.start)}, ${text(row.end)}, ${nullable(row.lunchStart)}, ${nullable(row.lunchEnd)}, true)
      `;
    }
    await tx`insert into audit_logs (user_id, action, entity_type, entity_id, metadata) values (${actor.profileId}, 'staff_schedule_updated', 'staff', ${staffId}, ${JSON.stringify({ rows: schedules.length })})`;
  });
  refreshAdmin();
}

export async function addStaffTimeOff(actor: InternalSession, staffId: string, body: Record<string, unknown>) {
  const db = requireDatabase();
  const startsAt = brusselsDateTimeToUtc(text(body.date), text(body.start));
  const endsAt = brusselsDateTimeToUtc(text(body.date), text(body.end));
  if (endsAt <= startsAt) throw new ValidationError("Time off end must be after start.");
  await db`insert into staff_time_off (staff_id, starts_at, ends_at, reason) values (${staffId}, ${startsAt.toISOString()}, ${endsAt.toISOString()}, ${text(body.reason)})`;
  await recordAuditLog({ userId: actor.profileId, action: "staff_time_off_added", entityType: "staff", entityId: staffId, metadata: { date: text(body.date) } });
  refreshAdmin();
}

export async function updateSalonSettings(actor: InternalSession, body: Record<string, unknown>) {
  const db = requireDatabase();
  await db.begin(async (tx) => {
    await tx`
      update salon_settings set salon_name = ${text(body.salonName)}, address = ${text(body.address)}, phone = ${text(body.phone)}, email = ${text(body.email)},
        minimum_booking_notice_minutes = ${int(body.bookingNotice)}, maximum_booking_period_days = ${int(body.maximumBookingPeriod)},
        cancellation_deadline_hours = ${int(body.cancellationDeadline)}, appointment_slot_interval_minutes = ${int(body.slotInterval)}, updated_at = now()
      where id = 'maison-elegance'
    `;
    for (const row of (body.openingHours as Record<string, unknown>[] | undefined) ?? []) {
      const active = Boolean(row.active);
      await tx`
        insert into salon_opening_hours (day_of_week, active, open_time, close_time, updated_at)
        values (${int(row.day)}, ${active}, ${active ? text(row.open) : null}, ${active ? text(row.close) : null}, now())
        on conflict (day_of_week) do update set active = excluded.active, open_time = excluded.open_time, close_time = excluded.close_time, updated_at = now()
      `;
    }
    await tx`insert into audit_logs (user_id, action, entity_type, entity_id, metadata) values (${actor.profileId}, 'settings_updated', 'salon_settings', 'maison-elegance', '{}'::jsonb)`;
  });
  refreshAdmin();
}

export async function updateExpense(actor: InternalSession, id: string, body: Record<string, unknown>) {
  const db = requireDatabase();
  await db.begin(async (tx) => {
    const [before] = await tx`select to_jsonb(expenses.*) as data from expenses where id = ${id} for update`;
    if (!before) throw new ValidationError("Expense not found.");
    await tx`update expenses set category = ${text(body.category)}, description = ${text(body.description)}, supplier = ${nullable(body.supplier)}, amount = ${num(body.amount)}, expense_date = ${text(body.expenseDate)}::date where id = ${id}`;
    const [after] = await tx`select to_jsonb(expenses.*) as data from expenses where id = ${id}`;
    await tx`insert into expense_audit (expense_id, changed_by, action, before_data, after_data) values (${id}, ${actor.profileId}, 'updated', ${before.data}, ${after.data})`;
    await tx`insert into audit_logs (user_id, action, entity_type, entity_id, metadata) values (${actor.profileId}, 'expense_updated', 'expense', ${id}, '{}'::jsonb)`;
  });
  refreshAdmin();
}

export async function deleteExpense(actor: InternalSession, id: string) {
  const db = requireDatabase();
  await db.begin(async (tx) => {
    const [before] = await tx`delete from expenses where id = ${id} returning to_jsonb(expenses.*) as data`;
    if (!before) throw new ValidationError("Expense not found.");
    await tx`insert into expense_audit (expense_id, changed_by, action, before_data) values (${id}, ${actor.profileId}, 'deleted', ${before.data})`;
    await tx`insert into audit_logs (user_id, action, entity_type, entity_id, metadata) values (${actor.profileId}, 'expense_deleted', 'expense', ${id}, ${before.data})`;
  });
  refreshAdmin();
}

export async function addCustomerNote(actor: InternalSession, customerId: string, note: string) {
  const clean = note.trim();
  if (!clean) throw new ValidationError("Note is required.");
  const db = requireDatabase();
  await db`insert into customer_notes (customer_id, note) values (${customerId}, ${clean})`;
  await recordAuditLog({ userId: actor.profileId, action: "customer_note_added", entityType: "customer", entityId: customerId });
  refreshAdmin();
}

export async function updateInternalAccount(actor: InternalSession, accountId: string, body: Record<string, unknown>) {
  const db = requireDatabase();
  await db`
    update profiles set role = ${text(body.role)}::internal_role, active = ${Boolean(body.active)}
    where id = ${accountId} and role in ('manager','admin')
  `;
  await recordAuditLog({ userId: actor.profileId, action: "internal_account_updated", entityType: "profile", entityId: accountId, metadata: { role: text(body.role), active: Boolean(body.active) } });
}

export function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [headers.join(","), ...rows.map((row) => headers.map((key) => JSON.stringify(row[key] ?? "")).join(","))].join("\n");
}

export function adminApiGuard(session: InternalSession | null) {
  if (!session) return apiError("Authentication required.", 401);
  if (!["manager", "admin"].includes(session.role)) return apiError("Forbidden.", 403);
  return null;
}

async function assertBookableWindow(tx: TransactionSql<Record<string, never>>, input: { appointmentId: string; serviceId: string; staffId: string; date: string; time: string; duration: number; status: AppointmentStatus }) {
  if (!["pending", "confirmed", "in_progress"].includes(input.status)) return;
  const day = new Date(`${input.date}T00:00:00`).getDay();
  const startAt = brusselsDateTimeToUtc(input.date, input.time);
  const endAt = new Date(startAt.getTime() + input.duration * 60000);
  const endTime = brusselsParts(endAt).time;
  const [qualified] = await tx`select 1 from staff st join staff_services ss on ss.staff_id = st.id where st.active = true and st.id = ${input.staffId} and ss.service_id = ${input.serviceId}`;
  if (!qualified) throw new ValidationError("Employee cannot perform this service.");
  const [salon] = await tx`select 1 from salon_opening_hours where day_of_week = ${day} and active = true and open_time <= ${input.time}::time and close_time >= ${endTime}::time`;
  if (!salon) throw new ValidationError("Appointment is outside salon opening hours.");
  const [work] = await tx`
    select 1 from staff_working_hours
    where staff_id = ${input.staffId} and day_of_week = ${day} and active = true
      and start_time <= ${input.time}::time and end_time >= ${endTime}::time
      and not (lunch_start is not null and lunch_end is not null and ${input.time}::time < lunch_end and ${endTime}::time > lunch_start)
  `;
  if (!work) throw new ValidationError("Appointment is outside employee working hours or lunch break.");
  const [timeOff] = await tx`select 1 from staff_time_off where staff_id = ${input.staffId} and tstzrange(starts_at, ends_at, '[)') && tstzrange(${startAt.toISOString()}, ${endAt.toISOString()}, '[)')`;
  if (timeOff) throw new ValidationError("Employee is off during this time.");
  const [overlap] = await tx`
    select 1 from appointments
    where id <> ${input.appointmentId}::uuid and staff_id = ${input.staffId} and status in ('pending','confirmed','in_progress')
      and tstzrange(start_at, end_at, '[)') && tstzrange(${startAt.toISOString()}, ${endAt.toISOString()}, '[)')
    limit 1
  `;
  if (overlap) throw new ValidationError("This change would double book the employee.");
}

function refreshAdmin() {
  for (const path of ["/admin", "/admin/calendar", "/admin/appointments", "/admin/customers", "/admin/staff", "/admin/services", "/admin/products", "/admin/payments", "/admin/expenses", "/admin/settings", "/admin/reports", "/book", "/services"]) {
    revalidatePath(path);
  }
}

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

function validDate(input?: string) {
  return input && /^\d{4}-\d{2}-\d{2}$/.test(input) ? input : "";
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function like(input?: string) {
  return input ? `%${input}%` : null;
}

function text(input: unknown) {
  return String(input ?? "").trim();
}

function nullable(input: unknown) {
  const cleaned = text(input);
  return cleaned || null;
}

function num(input: unknown) {
  const value = Number(input);
  if (!Number.isFinite(value) || value < 0) throw new ValidationError("Numeric value is invalid.");
  return value;
}

function int(input: unknown) {
  const value = Number(input);
  if (!Number.isInteger(value) || value < 0) throw new ValidationError("Integer value is invalid.");
  return value;
}

function array(input: unknown) {
  return Array.isArray(input) ? input.map(String).filter(Boolean) : [];
}

function slug(input: string) {
  const clean = input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!clean) throw new ValidationError("Name is required.");
  return clean;
}
