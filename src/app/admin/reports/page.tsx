import Link from "next/link";
import { getAdminRange, listAdminReports } from "@/lib/internal/admin";
import { requireAdminSession } from "@/lib/internal-route-guards";

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  await requireAdminSession();
  const params = await searchParams;
  const range = getAdminRange(params);
  const reports = await listAdminReports(range);
  const csvHref = `/api/admin/reports?period=custom&from=${range.from}&to=${range.to}`;
  return (
    <>
      <header className="border-b border-black/10 bg-white px-5 py-5 lg:px-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6b7772]">Admin reports</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Operational reports</h1><form className="mt-5 flex flex-wrap gap-2"><input name="from" type="date" defaultValue={range.from} className={inputClass} /><input name="to" type="date" defaultValue={range.to} className={inputClass} /><input type="hidden" name="period" value="custom" /><button className="rounded-xl bg-[#173d35] px-4 py-2 text-sm font-bold text-white">Run</button><Link className="rounded-xl border border-black/10 px-4 py-2 text-sm font-bold" href={csvHref}>Export CSV</Link></form></header>
      <div className="grid gap-5 p-5 lg:grid-cols-2 lg:p-8">{Object.entries(reports).map(([title, rows]) => <section key={title} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-semibold">{title.replace(/([A-Z])/g, " $1")}</h2>{(rows as Record<string, unknown>[]).length ? (rows as Record<string, unknown>[]).map((row) => <div key={String(row.label)} className="flex justify-between border-b border-black/5 py-2 text-sm"><span>{String(row.label)}</span><strong>{typeof row.value === "number" || !Number.isNaN(Number(row.value)) ? money(Number(row.value)) : String(row.value)}</strong></div>) : <p className="text-sm text-[#64736d]">No data for this range.</p>}</section>)}</div>
    </>
  );
}

const inputClass = "rounded-xl border border-black/10 px-3 py-2 text-sm";
function money(value: number) { return `EUR ${Math.round(value).toLocaleString("en-BE")}`; }
