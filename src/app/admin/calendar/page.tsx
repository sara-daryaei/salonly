import { EmptyState } from "@/components/admin-controls";
import { listAdminAppointments, listAdminServices } from "@/lib/internal/admin";
import { listStaff } from "@/lib/internal/staff";
import { requireAdminSession } from "@/lib/internal-route-guards";

export default async function AdminCalendarPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  await requireAdminSession();
  const params = await searchParams;
  const [rows, staff, services] = await Promise.all([
    listAdminAppointments({ from: params.date, to: params.date, status: params.status, staffId: params.staffId, serviceId: params.serviceId }),
    listStaff(),
    listAdminServices(),
  ]);
  return (
    <>
      <header className="border-b border-black/10 bg-white px-5 py-5 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6b7772]">Admin calendar</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Day calendar for all employees</h1>
        <form className="mt-5 grid gap-2 md:grid-cols-5">
          <input name="date" type="date" defaultValue={params.date ?? new Date().toISOString().slice(0, 10)} className={inputClass} />
          <select name="staffId" defaultValue={params.staffId ?? ""} className={inputClass}><option value="">All staff</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}</select>
          <select name="serviceId" defaultValue={params.serviceId ?? ""} className={inputClass}><option value="">All services</option>{services.map((s) => <option key={String(s.id)} value={String(s.id)}>{String(s.name)}</option>)}</select>
          <select name="status" defaultValue={params.status ?? ""} className={inputClass}><option value="">All statuses</option>{["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"].map((s) => <option key={s}>{s}</option>)}</select>
          <button className="rounded-xl bg-[#173d35] px-4 py-2 text-sm font-bold text-white">Show day</button>
        </form>
      </header>
      <div className="p-5 lg:p-8">
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          {rows.length ? <div className="grid gap-3">{rows.map((row) => <a key={String(row.id)} href={`/admin/appointments?q=${encodeURIComponent(String(row.booking_reference))}`} className="grid gap-2 rounded-xl border border-black/10 p-4 hover:bg-[#f5f7f6] md:grid-cols-[130px_1fr_1fr_1fr]"><strong>{time(row.start_at)}-{time(row.end_at)}</strong><span>{String(row.customer)}</span><span>{String(row.service)}</span><span>{String(row.staff)} · {String(row.status)}</span></a>)}</div> : <EmptyState>No appointments on this day for the selected filters.</EmptyState>}
        </section>
      </div>
    </>
  );
}

const inputClass = "rounded-xl border border-black/10 px-3 py-2 text-sm";
function time(value: unknown) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Brussels", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(String(value)));
}
