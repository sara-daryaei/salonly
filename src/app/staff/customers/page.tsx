import { InternalResourcePage } from "@/components/internal-resource-page";
import { getInternalSession } from "@/lib/internal-auth";
import { validateInternalSession } from "@/lib/internal-db";
import { listStaffCustomers } from "@/lib/internal/customers";

export default async function StaffCustomersPage() {
  const session = await validateInternalSession(await getInternalSession(), { roles: ["staff"], requireStaff: true });
  const rows = session?.staffId ? await listStaffCustomers(session.staffId) : [];
  return (
    <InternalResourcePage
      eyebrow="My customers"
      title="Customers"
      description="Customers connected to your assigned appointments."
      rows={rows}
      empty="No customers found for your appointments."
      columns={[
        { key: "name", label: "Name", render: (row) => <strong>{String(row.first_name)} {String(row.last_name)}</strong> },
        { key: "email", label: "Email", render: (row) => String(row.email) },
        { key: "phone", label: "Phone", render: (row) => String(row.phone) },
        { key: "appointments", label: "Appointments", render: (row) => String(row.appointments) },
      ]}
    />
  );
}
