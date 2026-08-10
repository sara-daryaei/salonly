import { requireDatabase } from "@/lib/db";

export async function listTransactions(filter: { staffId?: string } = {}) {
  const db = requireDatabase();
  return filter.staffId
    ? await db`select id::text, appointment_id::text, customer_id::text, staff_id, amount, discount, tip, payment_method, payment_status, transaction_type, created_at::text from transactions where staff_id = ${filter.staffId} order by created_at desc`
    : await db`select id::text, appointment_id::text, customer_id::text, staff_id, amount, discount, tip, payment_method, payment_status, transaction_type, created_at::text from transactions order by created_at desc`;
}
