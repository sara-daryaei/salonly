import { ScheduleEditor, StaffEditor, TimeOffEditor } from "@/components/admin-controls";
import { listAdminServices, listAdminStaff, listInternalAccounts } from "@/lib/internal/admin";
import { requireAdminSession } from "@/lib/internal-route-guards";
import { AccountEditor } from "@/components/admin-controls";

export default async function AdminStaffPage() {
  await requireAdminSession();
  const [rows, services, accounts] = await Promise.all([listAdminStaff(), listAdminServices(), listInternalAccounts()]);
  return (
    <>
      <header className="border-b border-black/10 bg-white px-5 py-5 lg:px-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6b7772]">Admin staff</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Employees, schedules and access</h1></header>
      <div className="space-y-5 p-5 lg:p-8">
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-semibold">Create employee</h2><StaffEditor services={services as unknown as Record<string, unknown>[]} /></section>
        {rows.map((person) => <article key={String(person.id)} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-semibold">{String(person.first_name)} {String(person.last_name)} · {Boolean(person.active) ? "active" : "inactive"}</h2><StaffEditor person={person as Record<string, unknown>} services={services as unknown as Record<string, unknown>[]} /><div className="mt-5 border-t border-black/10 pt-5"><h3 className="mb-3 font-semibold">Weekly schedule</h3><ScheduleEditor staffId={String(person.id)} /></div><div className="mt-5 border-t border-black/10 pt-5"><h3 className="mb-3 font-semibold">Time off</h3><TimeOffEditor staffId={String(person.id)} /></div></article>)}
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-semibold">Manager/admin accounts</h2><div className="space-y-4">{accounts.map((account) => <AccountEditor key={String(account.id)} account={account as Record<string, unknown>} />)}</div></section>
      </div>
    </>
  );
}
