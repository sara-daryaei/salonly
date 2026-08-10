import { notFound } from "next/navigation";
import { CustomerNoteForm, MiniStat } from "@/components/admin-controls";
import { getAdminCustomer } from "@/lib/internal/admin";
import { requireAdminSession } from "@/lib/internal-route-guards";

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const data = await getAdminCustomer((await params).id);
  if (!data) notFound();
  const { customer, appointments, notes } = data;
  return (
    <>
      <header className="border-b border-black/10 bg-white px-5 py-5 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6b7772]">Customer detail</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{String(customer.first_name)} {String(customer.last_name)}</h1>
        <p className="mt-2 text-sm text-[#52605b]">{String(customer.email)} · {String(customer.phone)}</p>
      </header>
      <div className="space-y-5 p-5 lg:p-8">
        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <MiniStat label="Appointments" value={String(customer.appointments)} />
          <MiniStat label="Total spend" value={money(Number(customer.total_spend))} />
          <MiniStat label="Last visit" value={short(customer.last_visit)} />
          <MiniStat label="Next visit" value={short(customer.next_appointment)} />
          <MiniStat label="No-shows" value={String(customer.no_show_count)} />
          <MiniStat label="Cancels" value={String(customer.cancellation_count)} />
        </section>
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-semibold">Add internal note</h2><CustomerNoteForm customerId={String(customer.id)} /></section>
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-semibold">Notes</h2>{notes.length ? notes.map((note) => <p key={String(note.id)} className="border-b border-black/5 py-3 text-sm">{String(note.note)} <span className="text-[#6b7772]">· {short(note.created_at)}</span></p>) : <p className="text-sm text-[#64736d]">No internal notes yet.</p>}</section>
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-semibold">Appointment history</h2>{appointments.length ? appointments.map((item) => <p key={String(item.id)} className="border-b border-black/5 py-3 text-sm">{String(item.booking_reference)} · {String(item.service)} · {String(item.staff)} · {short(item.start_at)} · {String(item.status)} · {money(Number(item.price))}</p>) : <p className="text-sm text-[#64736d]">No appointments yet.</p>}</section>
      </div>
    </>
  );
}

function money(value: number) { return `EUR ${Math.round(value).toLocaleString("en-BE")}`; }
function short(value: unknown) { return value ? new Date(String(value)).toLocaleDateString("en-BE", { timeZone: "Europe/Brussels" }) : "None"; }
