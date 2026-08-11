import { requireDatabase } from "@/lib/db";
import { mergeStaffReportingRows } from "@/lib/reporting";

export async function getStaffRevenueReport() {
  const db = requireDatabase();
  const rows = await db`
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
        and payment_status = 'paid'
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
  `;
  return mergeStaffReportingRows({
    staff: rows.map((row) => ({ id: String(row.staff_id), name: String(row.name) })),
    appointmentStats: rows.map((row) => ({
      staff_id: String(row.staff_id),
      appointments: Number(row.appointments),
      completed: Number(row.completed),
    })),
    transactionStats: rows.map((row) => ({
      staff_id: String(row.staff_id),
      revenue: Number(row.revenue),
      tips: Number(row.tips),
      transaction_count: Number(row.transaction_count),
    })),
  });
}

export async function getServiceRevenueReport() {
  const db = requireDatabase();
  const rows = await db`
    select s.id as service_id, s.name,
      count(distinct a.id)::int as bookings,
      coalesce(sum(t.amount), 0)::numeric as revenue
    from services s
    left join appointments a on a.service_id = s.id
    left join transactions t on t.appointment_id = a.id and t.transaction_type = 'service' and t.payment_status = 'paid'
    where s.active = true
    group by s.id, s.name
    having count(distinct a.id) > 0
    order by revenue desc, bookings desc
  `;
  return rows.map((row) => ({
    serviceId: String(row.service_id),
    name: String(row.name),
    bookings: Number(row.bookings),
    revenue: Number(row.revenue),
  }));
}
