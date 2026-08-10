import { requireDatabase } from "@/lib/db";

export type InternalStaffRecord = {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  photo: string;
  email: string;
  phone: string;
};

export async function listStaff(filter: { staffId?: string } = {}) {
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
