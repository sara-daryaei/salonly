import { InternalResourcePage } from "@/components/internal-resource-page";
import { listAppointments } from "@/lib/internal/appointments";

export default async function AdminCalendarPage() {
  const rows = await listAppointments();
  return (
    <InternalResourcePage
      eyebrow="Calendar"
      title="Salon calendar"
      description="Chronological appointment calendar backed by the appointments table."
      rows={rows}
      empty="No calendar appointments found."
      columns={[
        { key: "date", label: "Date", render: (row) => row.date },
        { key: "time", label: "Time", render: (row) => `${row.start}-${row.end}` },
        { key: "customer", label: "Customer", render: (row) => row.customer },
        { key: "service", label: "Service", render: (row) => row.serviceName },
        { key: "staff", label: "Staff", render: (row) => `${row.staffFirstName} ${row.staffLastName}` },
      ]}
    />
  );
}
