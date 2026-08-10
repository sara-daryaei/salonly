import { InternalResourcePage } from "@/components/internal-resource-page";
import { listAppointments } from "@/lib/internal/appointments";
import { requireAdminSession } from "@/lib/internal-route-guards";

export default async function AdminAppointmentsPage() {
  await requireAdminSession();
  const rows = await listAppointments();
  return (
    <InternalResourcePage
      eyebrow="Database appointments"
      title="Appointments"
      description="All internal appointment records from PostgreSQL, shared with the public booking flow."
      rows={rows}
      empty="No appointments found."
      columns={[
        { key: "customer", label: "Customer", render: (row) => <strong>{row.customer}</strong> },
        { key: "service", label: "Service", render: (row) => row.serviceName },
        { key: "staff", label: "Staff", render: (row) => `${row.staffFirstName} ${row.staffLastName}` },
        { key: "date", label: "Date", render: (row) => row.date },
        { key: "time", label: "Time", render: (row) => `${row.start}-${row.end}` },
        { key: "status", label: "Status", render: (row) => row.status.replace("_", " ") },
      ]}
    />
  );
}
