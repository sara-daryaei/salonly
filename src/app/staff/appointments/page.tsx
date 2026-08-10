import { InternalResourcePage } from "@/components/internal-resource-page";
import { getInternalSession } from "@/lib/internal-auth";
import { validateInternalSession } from "@/lib/internal-db";
import { listAppointments } from "@/lib/internal/appointments";

export default async function StaffAppointmentsPage() {
  const session = await validateInternalSession(await getInternalSession(), { roles: ["staff"], requireStaff: true });
  const rows = session?.staffId ? await listAppointments({ staffId: session.staffId }) : [];
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
