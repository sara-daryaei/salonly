import { InternalResourcePage } from "@/components/internal-resource-page";
import { listAppointments } from "@/lib/internal/appointments";
import { listTransactions } from "@/lib/internal/payments";
import { requireStaffSession } from "@/lib/internal-route-guards";

export default async function StaffAppointmentsPage({ searchParams }: { searchParams: Promise<{ date?: string; status?: string }> }) {
  const session = await requireStaffSession();
  const params = await searchParams;
  const [rows, transactions] = await Promise.all([
    listAppointments({ staffId: session.staffId!, date: params.date || undefined, status: params.status || undefined }),
    listTransactions({ staffId: session.staffId! }),
  ]);
  const paidAppointmentIds = new Set(transactions.filter((transaction) => transaction.transaction_type === "service").map((transaction) => String(transaction.appointment_id)));
  return (
    <>
      <form className="border-b border-black/10 bg-white px-5 py-4 lg:px-8">
        <div className="flex flex-wrap gap-3">
          <input name="date" type="date" defaultValue={params.date ?? ""} className="rounded-xl border border-black/10 px-3 py-2 text-sm" />
          <select name="status" defaultValue={params.status ?? ""} className="rounded-xl border border-black/10 px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"].map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
          </select>
          <button className="rounded-xl bg-[#2f4f46] px-4 py-2 text-sm font-bold text-white">Filter</button>
        </div>
      </form>
      <InternalResourcePage
        eyebrow="My database appointments"
        title="Appointments"
        description="Appointments assigned to your staff profile."
        rows={rows}
        empty="No appointments assigned to you."
        columns={[
          { key: "customer", label: "Customer", render: (row) => <strong>{row.customer}</strong> },
          { key: "details", label: "Customer details", render: (row) => `${row.phone} · ${row.email}` },
          { key: "service", label: "Service", render: (row) => row.serviceName },
          { key: "notes", label: "Notes", render: (row) => row.notes ?? "" },
          { key: "date", label: "Date", render: (row) => row.date },
          { key: "time", label: "Time", render: (row) => `${row.start}-${row.end}` },
          { key: "status", label: "Status", render: (row) => row.status.replace("_", " ") },
          { key: "payment", label: "Payment", render: (row) => paidAppointmentIds.has(row.appointmentId) ? "Paid" : "Open" },
        ]}
      />
    </>
  );
}
