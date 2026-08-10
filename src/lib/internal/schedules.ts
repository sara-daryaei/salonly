import { requireDatabase } from "@/lib/db";

export async function listStaffSchedules(filter: { staffId?: string } = {}) {
  const db = requireDatabase();
  return filter.staffId
    ? await db`
      select wh.id::text, wh.staff_id, st.first_name, st.last_name, wh.day_of_week, wh.start_time::text, wh.end_time::text, wh.lunch_start::text, wh.lunch_end::text, wh.active
      from staff_working_hours wh
      join staff st on st.id = wh.staff_id
      where wh.staff_id = ${filter.staffId}
      order by wh.day_of_week, wh.start_time
    `
    : await db`
      select wh.id::text, wh.staff_id, st.first_name, st.last_name, wh.day_of_week, wh.start_time::text, wh.end_time::text, wh.lunch_start::text, wh.lunch_end::text, wh.active
      from staff_working_hours wh
      join staff st on st.id = wh.staff_id
      order by st.first_name, wh.day_of_week, wh.start_time
    `;
}

export async function listSalonOpeningHours() {
  const db = requireDatabase();
  return db`select day_of_week, open_time::text, close_time::text, active from salon_opening_hours order by day_of_week`;
}

export async function listStaffTimeOff(staffId: string) {
  const db = requireDatabase();
  return db`
    select id::text, staff_id, starts_at::text, ends_at::text, reason
    from staff_time_off
    where staff_id = ${staffId}
    order by starts_at desc
  `;
}
