import { AppointmentEditor, EmptyState } from "@/components/admin-controls";
import { listAdminAppointments, listAdminServices } from "@/lib/internal/admin";
import { listStaff } from "@/lib/internal/staff";
import { requireAdminSession } from "@/lib/internal-route-guards";

export default async function AdminAppointmentsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  await requireAdminSession();
  const params = await searchParams;
  const [rows, staff, services] = await Promise.all([
    listAdminAppointments({ q: params.q, from: params.from, to: params.to, status: params.status, staffId: params.staffId, serviceId: params.serviceId }),
    listStaff(),
    listAdminServices(),
  ]);
  return (
    <>
      <header className="border-b border-black/10 bg-white px-5 py-5 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6b7772]">Admin appointments</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Search, reschedule and reassign</h1>
        <form className="mt-5 grid gap-2 md:grid-cols-6">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search" className={inputClass} />
          <input name="from" type="date" defaultValue={params.from ?? ""} className={inputClass} />
          <input name="to" type="date" defaultValue={params.to ?? ""} className={inputClass} />
          <select name="status" defaultValue={params.status ?? ""} className={inputClass}><option value="">All statuses</option>{["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"].map((s) => <option key={s}>{s}</option>)}</select>
          <select name="staffId" defaultValue={params.staffId ?? ""} className={inputClass}><option value="">All staff</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}</select>
          <button className="rounded-xl bg-[#173d35] px-4 py-2 text-sm font-bold text-white">Filter</button>
        </form>
      </header>
      <div className="space-y-4 p-5 lg:p-8">
        {rows.length ? rows.map((row) => (
          <article key={String(row.id)} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div><h2 className="font-semibold">{String(row.customer)} · {String(row.service)}</h2><p className="text-sm text-[#52605b]">{formatDate(row.start_at)} · {String(row.staff)} · {String(row.status).replace("_", " ")}</p></div>
              <p className="text-sm font-bold">Ref {String(row.booking_reference)}</p>
            </div>
            <AppointmentEditor appointment={JSON.parse(JSON.stringify(row))} staff={staff as unknown as Record<string, unknown>[]} services={services as unknown as Record<string, unknown>[]} />
          </article>
        )) : <EmptyState>No appointments match these filters.</EmptyState>}
      </div>
    </>
  );
}

const inputClass = "rounded-xl border border-black/10 px-3 py-2 text-sm";

function formatDate(value: unknown) {
  return new Date(String(value)).toLocaleString("en-BE", { timeZone: "Europe/Brussels" });
}
