import { requireDatabase } from "@/lib/db";

export async function listExpenses() {
  const db = requireDatabase();
  return db`select id::text, category, description, amount, expense_date::text, supplier, created_at::text from expenses order by expense_date desc, created_at desc`;
}
