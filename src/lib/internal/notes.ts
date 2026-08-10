import { requireDatabase } from "@/lib/db";

export async function listCustomerNotesForStaff(customerId: string, staffId: string) {
  const db = requireDatabase();
  return db`
    select cn.id::text, cn.customer_id::text, cn.staff_id, st.first_name, st.last_name, cn.note, cn.created_at::text
    from customer_notes cn
    join staff st on st.id = cn.staff_id
    where cn.customer_id = ${customerId}
      and exists (
        select 1 from appointments a
        where a.customer_id = cn.customer_id
          and a.staff_id = ${staffId}
      )
    order by cn.created_at desc
  `;
}
