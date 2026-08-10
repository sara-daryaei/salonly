import { InternalResourcePage } from "@/components/internal-resource-page";
import { listStaff } from "@/lib/internal/staff";
import { requireAdminSession } from "@/lib/internal-route-guards";

export default async function AdminStaffPage() {
  await requireAdminSession();
  const rows = await listStaff();
  return (
    <InternalResourcePage
      eyebrow="Employees"
      title="Staff"
      description="Active staff records used by bookings, schedules and internal authorization."
      rows={rows}
      empty="No active staff found."
      columns={[
        { key: "name", label: "Name", render: (row) => <strong>{row.firstName} {row.lastName}</strong> },
        { key: "title", label: "Title", render: (row) => row.title },
        { key: "email", label: "Email", render: (row) => row.email },
        { key: "phone", label: "Phone", render: (row) => row.phone },
      ]}
    />
  );
}
