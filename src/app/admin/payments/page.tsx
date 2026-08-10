import { InternalResourcePage } from "@/components/internal-resource-page";
import { listTransactions } from "@/lib/internal/payments";

export default async function AdminPaymentsPage() {
  const rows = await listTransactions();
  return (
    <InternalResourcePage
      eyebrow="Payments"
      title="Payments and transactions"
      description="Service transactions recorded by staff completion actions."
      rows={rows}
      empty="No transactions found."
      columns={[
        { key: "created", label: "Created", render: (row) => new Date(String(row.created_at)).toLocaleString("en-BE") },
        { key: "staff", label: "Staff", render: (row) => String(row.staff_id) },
        { key: "method", label: "Method", render: (row) => String(row.payment_method) },
        { key: "status", label: "Status", render: (row) => String(row.payment_status) },
        { key: "amount", label: "Amount", render: (row) => `EUR ${String(row.amount)}` },
      ]}
    />
  );
}
