import { requireDatabase } from "@/lib/db";

export async function getSalonSettings() {
  const db = requireDatabase();
  const rows = await db`select * from salon_settings where id = 'maison-elegance' limit 1`;
  return rows[0] ?? null;
}
