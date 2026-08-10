import { requireDatabase } from "@/lib/db";
import { brusselsParts } from "@/lib/time";
import type { Appointment } from "@/lib/salon-data";

export type InternalAppointmentRecord = Appointment & {
  appointmentId: string;
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  serviceName: string;
  staffFirstName: string;
  staffLastName: string;
};

export async function listAppointments(filter: { staffId?: string; date?: string; status?: string } = {}) {
  const db = requireDatabase();
  const rows = await db`
      select a.id::text as appointment_id, a.*, c.id::text as customer_id_text, c.first_name, c.last_name, c.email, c.phone, s.name as service_name, st.first_name as staff_first_name, st.last_name as staff_last_name
      from appointments a
      join customers c on c.id = a.customer_id
      join services s on s.id = a.service_id
      join staff st on st.id = a.staff_id
      where (${filter.staffId ?? null}::text is null or a.staff_id = ${filter.staffId ?? null})
        and (${filter.date ?? null}::text is null or a.start_at >= (${filter.date ?? null}::date at time zone 'Europe/Brussels') and a.start_at < (((${filter.date ?? null}::date + interval '1 day') at time zone 'Europe/Brussels')))
        and (${filter.status ?? null}::text is null or a.status::text = ${filter.status ?? null})
      order by a.start_at asc
    `;
  return rows.map(mapInternalAppointment);
}

export async function getStaffAppointment(appointmentId: string, staffId: string) {
  const rows = await listAppointments({ staffId });
  return rows.find((appointment) => appointment.appointmentId === appointmentId) ?? null;
}

function mapInternalAppointment(row: Record<string, unknown>): InternalAppointmentRecord {
  const start = new Date(row.start_at as Date);
  const end = new Date(row.end_at as Date);
  const startParts = brusselsParts(start);
  const endParts = brusselsParts(end);
  return {
    id: String(row.appointment_id),
    appointmentId: String(row.appointment_id),
    reference: String(row.booking_reference),
    customer: `${String(row.first_name)} ${String(row.last_name)}`,
    customerId: String(row.customer_id_text),
    customerFirstName: String(row.first_name),
    customerLastName: String(row.last_name),
    email: String(row.email),
    phone: String(row.phone),
    serviceId: String(row.service_id),
    serviceName: String(row.service_name),
    staffId: String(row.staff_id),
    staffFirstName: String(row.staff_first_name),
    staffLastName: String(row.staff_last_name),
    date: startParts.date,
    start: startParts.time,
    end: endParts.time,
    duration: Number(row.duration),
    price: Number(row.price),
    status: row.status as Appointment["status"],
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: row.created_at ? new Date(row.created_at as Date).toISOString() : undefined,
  };
}
