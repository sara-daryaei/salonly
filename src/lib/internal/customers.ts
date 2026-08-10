import { requireDatabase } from "@/lib/db";

export async function listCustomers() {
  const db = requireDatabase();
  return db`
    select c.id::text, c.first_name, c.last_name, c.email, c.phone, c.notes, c.created_at::text,
      count(a.id)::int as appointments,
      max(a.start_at)::text as last_appointment_at
    from customers c
    left join appointments a on a.customer_id = c.id
    group by c.id
    order by c.created_at desc
  `;
}

export async function listStaffCustomers(staffId: string) {
  const db = requireDatabase();
  return db`
    select c.id::text, c.first_name, c.last_name, c.email, c.phone, c.notes,
      count(a.id)::int as appointments,
      max(a.start_at)::text as last_appointment_at
    from customers c
    join appointments a on a.customer_id = c.id
    where a.staff_id = ${staffId}
    group by c.id
    order by last_appointment_at desc
  `;
}
