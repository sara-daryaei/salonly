import { StaffAppointmentActions } from "@/components/staff-appointment-actions";
import { listAdminServices } from "@/lib/internal/admin";
import { listAppointments } from "@/lib/internal/appointments";
import { listTransactions } from "@/lib/internal/payments";
import { listActiveProducts } from "@/lib/internal/products";
import { requireStaffSession } from "@/lib/internal-route-guards";

export default async function StaffAppointmentsPage({ searchParams }: { searchParams: Promise<{ date?: string; status?: string }> }) {
  const session = await requireStaffSession();
  const params = await searchParams;
  const [rows, transactions, products, services] = await Promise.all([
    listAppointments({ staffId: session.staffId!, date: params.date || undefined, status: params.status || undefined }),
    listTransactions({ staffId: session.staffId! }),
    listActiveProducts(),
    listAdminServices(),
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
      <div className="space-y-5 p-5 lg:p-8">
        {rows.length ? rows.map((row) => (
          <article key={row.appointmentId} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">{row.customer} - {row.serviceName}</h2>
              <p className="text-sm text-[#64736d]">{row.phone} - {row.email}</p>
              <p className="mt-1 text-sm text-[#64736d]">{row.date} - {row.start}-{row.end} - {row.status.replace("_", " ")} - {paidAppointmentIds.has(row.appointmentId) ? "Paid" : "Open"}</p>
              {row.notes ? <p className="mt-2 text-sm">{row.notes}</p> : null}
            </div>
            <StaffAppointmentActions appointment={row} products={products as unknown as Record<string, unknown>[]} services={services as unknown as Record<string, unknown>[]} />
          </article>
        )) : <p className="rounded-2xl border border-dashed border-black/15 bg-white p-5 text-sm font-semibold text-[#64736d]">No appointments assigned to you.</p>}
      </div>
    </>
  );
}
