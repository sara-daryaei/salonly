import { InternalResourcePage } from "@/components/internal-resource-page";
import { getStaffRevenueReport } from "@/lib/internal/reports";

export default async function AdminReportsPage() {
  const rows = await getStaffRevenueReport();
  return (
    <InternalResourcePage
      eyebrow="Reports"
      title="Staff revenue report"
      description="Revenue report built from separate appointment and transaction aggregates."
      rows={rows}
      empty="No report data found."
      columns={[
        { key: "name", label: "Staff", render: (row) => <strong>{row.name}</strong> },
        { key: "appointments", label: "Appointments", render: (row) => String(row.appointments) },
        { key: "completed", label: "Completed", render: (row) => String(row.completed) },
        { key: "revenue", label: "Revenue", render: (row) => `EUR ${Math.round(row.revenue)}` },
        { key: "tips", label: "Tips", render: (row) => `EUR ${Math.round(row.tips)}` },
        { key: "avg", label: "Avg ticket", render: (row) => `EUR ${Math.round(row.averageTicket)}` },
      ]}
    />
  );
}
