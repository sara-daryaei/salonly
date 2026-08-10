import Link from "next/link";
import { CustomerNoteForm, EmptyState } from "@/components/admin-controls";
import { listAdminCustomers } from "@/lib/internal/admin";
import { requireAdminSession } from "@/lib/internal-route-guards";

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdminSession();
  const params = await searchParams;
  const rows = await listAdminCustomers({ q: params.q });
  return (
    <>
      <header className="border-b border-black/10 bg-white px-5 py-5 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6b7772]">Admin customers</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Aggregated customer records</h1>
        <form className="mt-5 flex gap-2"><input name="q" defaultValue={params.q ?? ""} placeholder="Name, email or phone" className="w-full max-w-xl rounded-xl border border-black/10 px-3 py-2 text-sm" /><button className="rounded-xl bg-[#173d35] px-4 py-2 text-sm font-bold text-white">Search</button></form>
      </header>
      <div className="space-y-4 p-5 lg:p-8">
        {rows.length ? rows.map((row) => (
          <article key={String(row.id)} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div>
                <h2 className="text-xl font-semibold"><Link href={`/admin/customers/${String(row.id)}`}>{String(row.first_name)} {String(row.last_name)}</Link></h2>
                <p className="mt-1 text-sm text-[#52605b]">{String(row.email)} · {String(row.phone)}</p>
                <div className="mt-4 grid gap-2 md:grid-cols-6">
                  <Small label="Appointments" value={String(row.appointments)} /><Small label="Spend" value={money(Number(row.total_spend))} /><Small label="Last visit" value={short(row.last_visit)} /><Small label="Next" value={short(row.next_appointment)} /><Small label="No-shows" value={String(row.no_show_count)} /><Small label="Cancels" value={String(row.cancellation_count)} />
                </div>
              </div>
              <CustomerNoteForm customerId={String(row.id)} />
            </div>
          </article>
        )) : <EmptyState>No customers found.</EmptyState>}
      </div>
    </>
  );
}

function Small({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase text-[#6b7772]">{label}</p><p className="font-semibold">{value}</p></div>;
}
function money(value: number) { return `EUR ${Math.round(value).toLocaleString("en-BE")}`; }
function short(value: unknown) { return value ? new Date(String(value)).toLocaleDateString("en-BE", { timeZone: "Europe/Brussels" }) : "None"; }
