import { InternalResourcePage } from "@/components/internal-resource-page";
import { listAppointments } from "@/lib/internal/appointments";
import { listTransactions } from "@/lib/internal/payments";
import { listProductSales } from "@/lib/internal/products";
import { requireStaffSession } from "@/lib/internal-route-guards";

export default async function StaffPerformancePage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const session = await requireStaffSession();
  const params = await searchParams;
  const [rows, appointments, productSales] = await Promise.all([
    listTransactions({ staffId: session.staffId! }),
    listAppointments({ staffId: session.staffId! }),
    listProductSales({ staffId: session.staffId!, dateFrom: params.from, dateTo: params.to }),
  ]);
  const filteredTransactions = rows.filter((row) => inRange(String(row.created_at), params.from, params.to));
  const filteredAppointments = appointments.filter((row) => inRange(row.date, params.from, params.to));
  const completed = filteredAppointments.filter((row) => row.status === "completed").length;
  const serviceRevenue = filteredTransactions.reduce((sum, row) => sum + Number(row.amount), 0);
  const tips = filteredTransactions.reduce((sum, row) => sum + Number(row.tip), 0);
  const returningCustomers = new Set(filteredAppointments.filter((appointment) => appointments.filter((item) => item.customerId === appointment.customerId).length > 1).map((appointment) => appointment.customerId)).size;
  const summary = [
    { metric: "Completed appointments", value: completed },
    { metric: "Service revenue", value: `EUR ${Math.round(serviceRevenue)}` },
    { metric: "Average ticket", value: `EUR ${completed ? Math.round(serviceRevenue / completed) : 0}` },
    { metric: "Tips", value: `EUR ${Math.round(tips)}` },
    { metric: "Products sold", value: productSales.reduce((sum, sale) => sum + Number(sale.quantity), 0) },
    { metric: "Returning customers", value: returningCustomers },
    { metric: "No-shows", value: filteredAppointments.filter((row) => row.status === "no_show").length },
    { metric: "Cancellations", value: filteredAppointments.filter((row) => row.status === "cancelled").length },
  ];
  return (
    <>
      <form className="border-b border-black/10 bg-white px-5 py-4 lg:px-8">
        <div className="flex flex-wrap gap-3">
          <input name="from" type="date" defaultValue={params.from ?? ""} className="rounded-xl border border-black/10 px-3 py-2 text-sm" />
          <input name="to" type="date" defaultValue={params.to ?? ""} className="rounded-xl border border-black/10 px-3 py-2 text-sm" />
          <button className="rounded-xl bg-[#2f4f46] px-4 py-2 text-sm font-bold text-white">Filter</button>
        </div>
      </form>
      <InternalResourcePage
        eyebrow="My performance"
        title="Period summary"
        description="Own performance metrics from appointments, transactions and product sales."
        rows={summary}
        empty="No performance data found."
        columns={[
          { key: "metric", label: "Metric", render: (row) => <strong>{row.metric}</strong> },
          { key: "value", label: "Value", render: (row) => String(row.value) },
        ]}
      />
      <InternalResourcePage
        eyebrow="My payments"
        title="Payments recorded"
        description="Transactions recorded from your completed appointments."
        rows={filteredTransactions}
        empty="No payments recorded for your profile."
        columns={[
          { key: "created", label: "Created", render: (row) => new Date(String(row.created_at)).toLocaleString("en-BE") },
          { key: "method", label: "Method", render: (row) => String(row.payment_method) },
          { key: "amount", label: "Amount", render: (row) => `EUR ${String(row.amount)}` },
          { key: "tip", label: "Tip", render: (row) => `EUR ${String(row.tip)}` },
          { key: "status", label: "Status", render: (row) => String(row.payment_status) },
        ]}
      />
    </>
  );
}

function inRange(value: string, from?: string, to?: string) {
  const date = value.slice(0, 10);
  return (!from || date >= from) && (!to || date <= to);
}
