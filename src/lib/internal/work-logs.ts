import { requireDatabase } from "@/lib/db";
import { brusselsParts } from "@/lib/time";

export async function getTodayWorkLog(staffId: string) {
  const db = requireDatabase();
  const today = brusselsParts().date;
  const rows = await db`
    select id::text, staff_id, work_date::text, clock_in::text, clock_out::text, break_minutes, notes
    from staff_work_logs
    where staff_id = ${staffId} and work_date = ${today}
    order by clock_in desc nulls last
    limit 1
  `;
  return rows[0] ?? null;
}

export async function clockIn(staffId: string) {
  const db = requireDatabase();
  const today = brusselsParts().date;
  const open = await db`select id from staff_work_logs where staff_id = ${staffId} and clock_out is null limit 1`;
  if (open[0]) throw new Error("You already have an open work session.");
  const rows = await db`
    insert into staff_work_logs (staff_id, work_date, clock_in)
    values (${staffId}, ${today}, now())
    returning id::text, clock_in::text
  `;
  return rows[0];
}

export async function clockOut(staffId: string) {
  const db = requireDatabase();
  const rows = await db`
    update staff_work_logs
    set clock_out = now()
    where id = (
      select id from staff_work_logs
      where staff_id = ${staffId} and clock_out is null
      order by clock_in desc
      limit 1
    )
    returning id::text, clock_out::text
  `;
  if (!rows[0]) throw new Error("You do not have an open work session.");
  return rows[0];
}
