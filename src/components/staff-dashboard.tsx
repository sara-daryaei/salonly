"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CalendarCheck, CheckCircle2, Clock, CreditCard, Package } from "lucide-react";
import { StaffAppointmentActions } from "@/components/staff-appointment-actions";
import type { InternalSession } from "@/lib/internal-auth";
import type { StaffDashboardData } from "@/lib/internal-db";

type StaffAppointment = StaffDashboardData["appointments"][number];

export function StaffDashboard({
  data,
  session,
  services,
}: {
  data: StaffDashboardData;
  session: InternalSession;
  services: Record<string, unknown>[];
}) {
  void session;
  const router = useRouter();
  const visibleAppointments = useMemo(
    () => data.appointments.filter((item) => ["pending", "confirmed", "in_progress", "completed", "no_show"].includes(item.status)),
    [data.appointments],
  );
  const [active, setActive] = useState<StaffAppointment | null>(
    visibleAppointments.find((item) => ["pending", "confirmed", "in_progress"].includes(item.status)) ?? visibleAppointments[0] ?? data.appointments[0] ?? null,
  );
  const [workMessage, setWorkMessage] = useState("");
  const [workBusy, setWorkBusy] = useState(false);

  async function workLog(action: "clock-in" | "clock-out") {
    setWorkBusy(true);
    setWorkMessage("");
    const response = await fetch(`/api/staff/work-logs/${action}`, { method: "POST" });
    const payload = await response.json().catch(() => null);
    setWorkBusy(false);
    setWorkMessage(response.ok ? (action === "clock-in" ? "Clocked in." : "Clocked out.") : payload?.error ?? "Could not update work log.");
    if (response.ok) router.refresh();
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 xl:grid-cols-[320px_1fr]">
      <aside className="space-y-4">
        <Metric icon={<CalendarCheck size={18} />} label="Today appointments" value={String(data.todaysAppointments.length)} />
        <Metric icon={<Banknote size={18} />} label="Today revenue" value={`EUR ${Math.round(data.metrics.revenue)}`} />
        <Metric icon={<CreditCard size={18} />} label="Today tips" value={`EUR ${Math.round(data.metrics.tips)}`} />
        <Metric icon={<CheckCircle2 size={18} />} label="Completed" value={String(data.metrics.completed)} />
        <Metric icon={<Package size={18} />} label="Products sold" value={String(data.productSales.reduce((sum, sale) => sum + Number(sale.quantity), 0))} />
        <article className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[#64736d]"><CalendarCheck size={18} /><p className="text-xs font-bold uppercase tracking-wider">Next appointment</p></div>
          <p className="mt-4 text-sm font-semibold">{data.nextAppointment ? `${data.nextAppointment.serviceName} - ${data.nextAppointment.date} ${data.nextAppointment.start}` : "No upcoming appointment"}</p>
        </article>
        <article className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[#64736d]"><Clock size={18} /><p className="text-xs font-bold uppercase tracking-wider">Working hours today</p></div>
          <p className="mt-4 text-sm font-semibold">{data.workLog?.clock_in ? `${new Date(String(data.workLog.clock_in)).toLocaleTimeString("en-BE", { hour: "2-digit", minute: "2-digit" })} - ${data.workLog.clock_out ? new Date(String(data.workLog.clock_out)).toLocaleTimeString("en-BE", { hour: "2-digit", minute: "2-digit" }) : "open"}` : "Not clocked in"}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button disabled={workBusy || Boolean(data.workLog?.clock_in && !data.workLog?.clock_out)} onClick={() => workLog("clock-in")} className="rounded-xl border border-black/10 px-3 py-2 text-xs font-bold disabled:opacity-50">Clock in</button>
            <button disabled={workBusy || !data.workLog?.clock_in || Boolean(data.workLog?.clock_out)} onClick={() => workLog("clock-out")} className="rounded-xl border border-black/10 px-3 py-2 text-xs font-bold disabled:opacity-50">Clock out</button>
          </div>
          {workMessage ? <p className="mt-3 text-xs font-semibold text-[#64736d]">{workMessage}</p> : null}
        </article>
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
            {visibleAppointments.length ? visibleAppointments.map((appointment) => (
              <button key={appointment.appointmentId} onClick={() => setActive(appointment)} className={`w-full rounded-2xl border p-4 text-left ${active?.appointmentId === appointment.appointmentId ? "border-[#2f4f46] bg-[#eef4ef]" : "border-black/10 bg-white"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{appointment.customer}</p>
                    <p className="mt-1 text-sm text-[#64736d]">{appointment.serviceName} - {appointment.date} - {appointment.start}-{appointment.end}</p>
                  </div>
                  <Status status={appointment.status} />
                </div>
              </button>
            )) : <p className="rounded-2xl border border-dashed border-black/15 p-5 text-sm text-[#64736d]">No appointments assigned to you.</p>}
          </div>
        </div>

        <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
          {active ? (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#917252]">Appointment detail</p>
              <h2 className="mt-2 text-2xl font-semibold">{active.serviceName}</h2>
              <p className="mt-3 text-sm text-[#64736d]">{active.customer} - {active.phone}</p>
              <p className="mt-1 text-sm text-[#64736d]">{active.date} - {active.start}-{active.end}</p>
              <div className="mt-5">
                <StaffAppointmentActions appointment={active} products={data.products as unknown as Record<string, unknown>[]} services={services} />
              </div>
            </>
          ) : (
            <p className="text-sm font-semibold text-[#64736d]">Select an appointment.</p>
          )}
        </section>
      </section>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <article className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-[#64736d]">{icon}<p className="text-xs font-bold uppercase tracking-wider">{label}</p></div><p className="mt-4 text-3xl font-semibold">{value}</p></article>;
}

function Status({ status }: { status: string }) {
  return <span className="rounded-full bg-[#f0e7dc] px-3 py-1 text-xs font-bold text-[#684d3e]">{status.replace("_", " ")}</span>;
}
