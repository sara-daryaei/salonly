import { InternalResourcePage } from "@/components/internal-resource-page";
import { listAppointments } from "@/lib/internal/appointments";
import { requireStaffSession } from "@/lib/internal-route-guards";

export default async function StaffAppointmentsPage() {
  const session = await requireStaffSession();
  const rows = await listAppointments({ staffId: session.staffId! });
  return (
    <InternalResourcePage
      eyebrow="My database appointments"
      title="Appointments"
      description="Appointments assigned to your staff profile."
      rows={rows}
      empty="No appointments assigned to you."
      columns={[
        { key: "customer", label: "Customer", render: (row) => <strong>{row.customer}</strong> },
        { key: "service", label: "Service", render: (row) => row.serviceName },
        { key: "date", label: "Date", render: (row) => row.date },
        { key: "time", label: "Time", render: (row) => `${row.start}-${row.end}` },
        { key: "status", label: "Status", render: (row) => row.status.replace("_", " ") },
      ]}
    />
  );
}
