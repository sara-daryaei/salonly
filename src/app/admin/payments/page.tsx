import { EmptyState } from "@/components/admin-controls";
import { listAdminPayments } from "@/lib/internal/admin";
import { listStaff } from "@/lib/internal/staff";
import { requireAdminSession } from "@/lib/internal-route-guards";

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; staffId?: string; method?: string }> }) {
  await requireAdminSession();
  const params = await searchParams;
  const [rows, staff] = await Promise.all([listAdminPayments(params), listStaff()]);
  return (
    <>
      <header className="border-b border-black/10 bg-white px-5 py-5 lg:px-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6b7772]">Admin payments</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Financial records</h1><form className="mt-5 grid gap-2 md:grid-cols-5"><input name="from" type="date" defaultValue={params.from ?? ""} className={inputClass} /><input name="to" type="date" defaultValue={params.to ?? ""} className={inputClass} /><select name="staffId" defaultValue={params.staffId ?? ""} className={inputClass}><option value="">All staff</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}</select><select name="method" defaultValue={params.method ?? ""} className={inputClass}><option value="">All methods</option>{["cash", "card", "bancontact", "online", "other"].map((m) => <option key={m}>{m}</option>)}</select><button className="rounded-xl bg-[#173d35] px-4 py-2 text-sm font-bold text-white">Filter</button></form></header>
      <div className="p-5 lg:p-8"><section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">{rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead><tr>{["Date", "Appointment", "Customer", "Staff", "Service", "Amount", "Discount", "Tip", "Products", "Method", "Status"].map((h) => <th key={h} className="border-b border-black/10 py-3">{h}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={String(row.id)}>{[date(row.created_at), String(row.booking_reference ?? ""), String(row.customer ?? ""), String(row.staff ?? ""), String(row.service ?? ""), money(Number(row.amount)), money(Number(row.discount)), money(Number(row.tip)), money(Number(row.products)), String(row.payment_method), String(row.payment_status)].map((cell, i) => <td key={i} className="border-b border-black/5 py-3 pr-3">{cell}</td>)}</tr>)}</tbody></table></div> : <EmptyState>No transactions match these filters.</EmptyState>}<p className="mt-4 text-sm font-semibold text-[#6b7772]">Paid financial records are read-only here. Corrections require an explicit audited void/adjustment workflow.</p></section></div>
    </>
  );
}

const inputClass = "rounded-xl border border-black/10 px-3 py-2 text-sm";
function money(value: number) { return `EUR ${Math.round(value).toLocaleString("en-BE")}`; }
function date(value: unknown) { return new Date(String(value)).toLocaleString("en-BE", { timeZone: "Europe/Brussels" }); }
