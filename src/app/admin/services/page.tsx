import { ServiceEditor } from "@/components/admin-controls";
import { listAdminServices } from "@/lib/internal/admin";
import { listStaff } from "@/lib/internal/staff";
import { requireAdminSession } from "@/lib/internal-route-guards";

export default async function AdminServicesPage() {
  await requireAdminSession();
  const [rows, staff] = await Promise.all([listAdminServices(), listStaff()]);
  return (
    <>
      <header className="border-b border-black/10 bg-white px-5 py-5 lg:px-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6b7772]">Admin services</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Service catalog CRUD</h1></header>
      <div className="space-y-5 p-5 lg:p-8"><section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-semibold">Create service</h2><ServiceEditor staff={staff as unknown as Record<string, unknown>[]} /></section>{rows.map((service) => <article key={String(service.id)} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-semibold">{String(service.name)} · {Boolean(service.active) ? "bookable" : "disabled"}</h2><ServiceEditor service={service as Record<string, unknown>} staff={staff as unknown as Record<string, unknown>[]} /></article>)}</div>
    </>
  );
}
