"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CalendarCheck, CheckCircle2, Clock, CreditCard, UserRound, XCircle } from "lucide-react";
import type { InternalSession } from "@/lib/internal-auth";
import type { StaffDashboardData } from "@/lib/internal-db";
import { paymentMethods } from "@/lib/security-rules";

type StaffAppointment = StaffDashboardData["appointments"][number];

export function StaffDashboard({ data, session }: { data: StaffDashboardData; session: InternalSession }) {
  void session;
  const router = useRouter();
  const [active, setActive] = useState<StaffAppointment | null>(data.appointments.find((item) => ["pending", "confirmed"].includes(item.status)) ?? data.appointments[0] ?? null);
  const upcoming = useMemo(() => data.appointments.filter((item) => ["pending", "confirmed"].includes(item.status)), [data.appointments]);

  return (
    <>
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <Metric icon={<CalendarCheck size={18} />} label="Today appointments" value={String(data.todaysAppointments.length)} />
          <Metric icon={<Banknote size={18} />} label="Today revenue" value={`EUR ${Math.round(data.metrics.revenue)}`} />
          <Metric icon={<CreditCard size={18} />} label="Today tips" value={`EUR ${Math.round(data.metrics.tips)}`} />
          <Metric icon={<CheckCircle2 size={18} />} label="Completed" value={String(data.metrics.completed)} />
        </aside>

        <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#917252]">My appointments</p>
                <h1 className="mt-2 text-3xl font-semibold">Workday queue</h1>
              </div>
              <button onClick={() => router.refresh()} className="rounded-xl border border-black/10 px-4 py-2 text-sm font-bold">Refresh</button>
            </div>
            <div className="mt-5 space-y-3">
              {upcoming.length ? upcoming.map((appointment) => (
                <button key={appointment.appointmentId} onClick={() => setActive(appointment)} className={`w-full rounded-2xl border p-4 text-left ${active?.appointmentId === appointment.appointmentId ? "border-[#2f4f46] bg-[#eef4ef]" : "border-black/10 bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{appointment.customer}</p>
                      <p className="mt-1 text-sm text-[#64736d]">{appointment.serviceName} · {appointment.date} · {appointment.start}-{appointment.end}</p>
                    </div>
                    <Status status={appointment.status} />
                  </div>
                </button>
              )) : <p className="rounded-2xl border border-dashed border-black/15 p-5 text-sm text-[#64736d]">No upcoming appointments assigned to you.</p>}
            </div>
          </div>

          <AppointmentPanel appointment={active} />
        </section>
      </div>
    </>
  );
}

function AppointmentPanel({ appointment }: { appointment: StaffAppointment | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!appointment) {
    return <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">Select an appointment.</section>;
  }

  async function complete(formData: FormData) {
    const current = appointment;
    if (!current) return;
    setBusy(true);
    setMessage("");
    setError("");
    const response = await fetch(`/api/staff/appointments/${current.appointmentId}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        amount: Number(formData.get("amount")),
        discount: Number(formData.get("discount")),
        tip: Number(formData.get("tip")),
        paymentMethod: formData.get("paymentMethod"),
        note: formData.get("note"),
      }),
    });
    const payload = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setError(payload?.error ?? "Could not complete this appointment.");
      return;
    }
    setMessage("Appointment completed and payment recorded.");
    router.refresh();
  }

  async function mark(status: "cancelled" | "no_show") {
    const current = appointment;
    if (!current) return;
    setBusy(true);
    setMessage("");
    setError("");
    const response = await fetch(`/api/staff/appointments/${current.appointmentId}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const payload = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setError(payload?.error ?? "Could not update appointment.");
      return;
    }
    setMessage(`Appointment marked ${status.replace("_", " ")}.`);
    router.refresh();
  }

  return (
    <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#917252]">Appointment detail</p>
      <h2 className="mt-2 text-2xl font-semibold">{appointment.serviceName}</h2>
      <div className="mt-4 space-y-3 text-sm text-[#3f4a45]">
        <p className="flex gap-2"><UserRound size={17} /> {appointment.customer} · {appointment.phone}</p>
        <p className="flex gap-2"><Clock size={17} /> {appointment.date} · {appointment.start}-{appointment.end}</p>
      </div>

      <form action={complete} className="mt-6 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs font-bold">Amount<input name="amount" type="number" step="0.01" defaultValue={appointment.price} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm" /></label>
          <label className="text-xs font-bold">Discount<input name="discount" type="number" step="0.01" defaultValue={0} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm" /></label>
          <label className="text-xs font-bold">Tip<input name="tip" type="number" step="0.01" defaultValue={0} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm" /></label>
        </div>
        <select name="paymentMethod" defaultValue="card" className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm">
          {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
        </select>
        <textarea name="note" rows={4} placeholder="Service notes, formula, customer preferences" className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm" />
        <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2f4f46] px-4 py-3 font-bold text-white"><CheckCircle2 size={18} /> Complete and record payment</button>
      </form>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button disabled={busy} onClick={() => mark("no_show")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-3 text-sm font-bold"><XCircle size={16} /> No show</button>
        <button disabled={busy} onClick={() => mark("cancelled")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-3 text-sm font-bold">Cancel</button>
      </div>
      {message ? <p className="mt-4 rounded-xl bg-[#f7f3ed] px-4 py-3 text-sm font-semibold">{message}</p> : null}
      {error ? <p className="mt-4 rounded-xl bg-[#fff2ee] px-4 py-3 text-sm font-semibold text-[#9c3d28]">{error}</p> : null}
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <article className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-[#64736d]">{icon}<p className="text-xs font-bold uppercase tracking-wider">{label}</p></div><p className="mt-4 text-3xl font-semibold">{value}</p></article>;
}

function Status({ status }: { status: string }) {
  return <span className="rounded-full bg-[#f0e7dc] px-3 py-1 text-xs font-bold text-[#684d3e]">{status.replace("_", " ")}</span>;
}
