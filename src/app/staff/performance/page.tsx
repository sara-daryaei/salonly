import { InternalResourcePage } from "@/components/internal-resource-page";
import { getInternalSession } from "@/lib/internal-auth";
import { validateInternalSession } from "@/lib/internal-db";
import { listTransactions } from "@/lib/internal/payments";

export default async function StaffPerformancePage() {
  const session = await validateInternalSession(await getInternalSession(), { roles: ["staff"], requireStaff: true });
  const rows = session?.staffId ? await listTransactions({ staffId: session.staffId }) : [];
  return (
    <InternalResourcePage
      eyebrow="My performance"
      title="Payments recorded"
      description="Transactions recorded from your completed appointments."
      rows={rows}
      empty="No payments recorded for your profile."
      columns={[
        { key: "created", label: "Created", render: (row) => new Date(String(row.created_at)).toLocaleString("en-BE") },
        { key: "method", label: "Method", render: (row) => String(row.payment_method) },
        { key: "amount", label: "Amount", render: (row) => `EUR ${String(row.amount)}` },
        { key: "tip", label: "Tip", render: (row) => `EUR ${String(row.tip)}` },
        { key: "status", label: "Status", render: (row) => String(row.payment_status) },
      ]}
    />
  );
}
