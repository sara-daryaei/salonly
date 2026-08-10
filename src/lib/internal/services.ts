import { requireDatabase } from "@/lib/db";

export async function listServices() {
  const db = requireDatabase();
  return db`
    select s.id, s.name, s.category, s.description, s.price, s.duration, s.active,
      count(a.id)::int as appointments
    from services s
    left join appointments a on a.service_id = s.id
    group by s.id
    order by s.category, s.name
  `;
}
