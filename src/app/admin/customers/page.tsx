import { InternalResourcePage } from "@/components/internal-resource-page";
import { listCustomers } from "@/lib/internal/customers";
import { requireAdminSession } from "@/lib/internal-route-guards";

export default async function AdminCustomersPage() {
  await requireAdminSession();
  const rows = await listCustomers();
  return (
    <InternalResourcePage
      eyebrow="Customer records"
      title="Customers"
      description="Customer profiles and appointment counts from PostgreSQL."
      rows={rows}
      empty="No customers found."
      columns={[
        { key: "name", label: "Name", render: (row) => <strong>{String(row.first_name)} {String(row.last_name)}</strong> },
        { key: "email", label: "Email", render: (row) => String(row.email) },
        { key: "phone", label: "Phone", render: (row) => String(row.phone) },
        { key: "appointments", label: "Appointments", render: (row) => String(row.appointments) },
        { key: "last", label: "Last appointment", render: (row) => row.last_appointment_at ? new Date(String(row.last_appointment_at)).toLocaleDateString("en-BE") : "None" },
      ]}
    />
  );
}
