import Link from "next/link";
import { MiniStat } from "@/components/admin-controls";
import { getAdminRange, listAdminAppointments, listAdminOverview } from "@/lib/internal/admin";
import { requireAdminSession } from "@/lib/internal-route-guards";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  await requireAdminSession();
  const params = await searchParams;
  const range = getAdminRange(params);
  const [metrics, appointments] = await Promise.all([listAdminOverview(range), listAdminAppointments({ from: range.from, to: range.to })]);
  return (
    <>
      <header className="border-b border-black/10 bg-white px-5 py-5 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6b7772]">Admin overview</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Maison Elegance operations</h1>
        <form className="mt-5 flex flex-wrap items-end gap-2">
          <select name="period" defaultValue={String(params.period ?? "today")} className="rounded-xl border border-black/10 px-3 py-2 text-sm">
            <option value="today">Today</option><option value="7d">7 days</option><option value="30d">30 days</option><option value="month">This month</option><option value="custom">Custom range</option>
          </select>
          <input name="from" type="date" defaultValue={range.from} className="rounded-xl border border-black/10 px-3 py-2 text-sm" />
          <input name="to" type="date" defaultValue={range.to} className="rounded-xl border border-black/10 px-3 py-2 text-sm" />
          <button className="rounded-xl bg-[#173d35] px-4 py-2 text-sm font-bold text-white">Apply</button>
        </form>
      </header>
      <div className="space-y-6 p-5 lg:p-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Service revenue" value={money(metrics.serviceRevenue)} />
          <MiniStat label="Product revenue" value={money(metrics.productRevenue)} />
          <MiniStat label="Tips" value={money(metrics.tips)} />
          <MiniStat label="Expenses" value={money(metrics.expenses)} />
          <MiniStat label="Operational result" value={money(metrics.operationalResult)} />
          <MiniStat label="Appointments" value={String(metrics.appointments)} />
          <MiniStat label="Completed" value={String(metrics.completed)} />
          <MiniStat label="Cancelled" value={String(metrics.cancelled)} />
          <MiniStat label="No-shows" value={String(metrics.noShows)} />
          <MiniStat label="New customers" value={String(metrics.newCustomers)} />
          <MiniStat label="Returning customers" value={String(metrics.returningCustomers)} />
          <MiniStat label="Average ticket" value={money(metrics.averageTicket)} />
        </section>
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Appointments in {range.label.toLowerCase()}</h2>
            <Link href="/admin/appointments" className="rounded-xl border border-black/10 px-4 py-2 text-sm font-bold">Manage all</Link>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead><tr>{["Date", "Customer", "Service", "Staff", "Status", "Amount"].map((h) => <th key={h} className="border-b border-black/10 py-3">{h}</th>)}</tr></thead>
              <tbody>{appointments.map((row) => <tr key={String(row.id)}><td className="border-b border-black/5 py-3">{formatDate(row.start_at)}</td><td className="border-b border-black/5 py-3 font-semibold">{String(row.customer)}</td><td className="border-b border-black/5 py-3">{String(row.service)}</td><td className="border-b border-black/5 py-3">{String(row.staff)}</td><td className="border-b border-black/5 py-3">{String(row.status).replace("_", " ")}</td><td className="border-b border-black/5 py-3">{money(Number(row.price))}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function money(value: number) {
  return `EUR ${Math.round(value).toLocaleString("en-BE")}`;
}

function formatDate(value: unknown) {
  return new Date(String(value)).toLocaleString("en-BE", { timeZone: "Europe/Brussels" });
}
