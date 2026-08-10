"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, BarChart3, CalendarDays, CreditCard, Plus, ReceiptText, Scissors, TrendingUp } from "lucide-react";
import type { AdminDashboardData } from "@/lib/internal-db";

type AdminAppointment = AdminDashboardData["appointments"][number];

export function AdminDashboard({ data, initialSection }: { data: AdminDashboardData; initialSection?: string }) {
  void initialSection;
  const router = useRouter();
  const [expenseMessage, setExpenseMessage] = useState("");
  const [expenseBusy, setExpenseBusy] = useState(false);
  const upcoming = useMemo(() => data.appointments.filter((item) => ["pending", "confirmed"].includes(item.status)).slice(0, 8), [data.appointments]);
  const expenseTotal = data.expenses.reduce((sum, item) => sum + Number(item.amount), 0);

  async function addExpense(formData: FormData) {
    setExpenseMessage("");
    setExpenseBusy(true);
    const response = await fetch("/api/admin/expenses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        category: formData.get("category"),
        description: formData.get("description"),
        supplier: formData.get("supplier"),
        amount: Number(formData.get("amount")),
        expenseDate: formData.get("expenseDate"),
      }),
    });
    const payload = await response.json().catch(() => null);
    setExpenseBusy(false);
    if (!response.ok) {
      setExpenseMessage(payload?.error ?? "Expense could not be saved.");
      return;
    }
    setExpenseMessage("Expense saved.");
    router.refresh();
  }

  return (
    <>
      <header className="border-b border-black/10 bg-white px-5 py-5 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6b7772]">Manager and admin workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Maison Elegance operations</h1>
          </div>
          <button onClick={() => router.refresh()} className="inline-flex items-center gap-2 rounded-xl bg-[#173d35] px-4 py-3 text-sm font-semibold text-white"><TrendingUp size={17} /> Refresh live data</button>
        </div>
      </header>

      <div className="space-y-6 p-5 lg:p-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Metric icon={<CalendarDays size={18} />} label="Appointments" value={String(data.metrics.appointments)} />
          <Metric icon={<Scissors size={18} />} label="Completed" value={String(data.metrics.completed)} />
          <Metric icon={<Banknote size={18} />} label="Revenue" value={money(data.metrics.revenue)} />
          <Metric icon={<CreditCard size={18} />} label="Tips" value={money(data.metrics.tips)} />
          <Metric icon={<ReceiptText size={18} />} label="Expenses" value={money(expenseTotal)} />
          <Metric icon={<BarChart3 size={18} />} label="Result" value={money(data.operationalResult)} />
        </section>

        <section id="calendar" className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Live appointment overview</h2>
              <p className="mt-1 text-sm text-[#52605b]">Using the same appointments table as the public booking flow.</p>
            </div>
            <StatusPills completed={data.metrics.completed} cancelled={data.metrics.cancelled} noShow={data.metrics.noShow} />
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="text-[#52605b]">
                <tr>{["Customer", "Service", "Employee", "Date", "Time", "Price", "Status"].map((heading) => <th key={heading} className="border-b border-black/10 py-3">{heading}</th>)}</tr>
              </thead>
              <tbody>
                {upcoming.map((appointment) => <AppointmentRow key={appointment.appointmentId} appointment={appointment} />)}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section id="staff" className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Staff performance</h2>
            <div className="mt-5 grid gap-3">
              {data.revenueByStaff.map((person) => (
                <article key={person.staffId} className="grid gap-3 rounded-xl border border-black/10 p-4 md:grid-cols-[1fr_repeat(4,110px)] md:items-center">
                  <div>
                    <p className="font-semibold">{person.name}</p>
                    <p className="text-sm text-[#52605b]">{person.appointments} appointments · {person.completed} completed</p>
                  </div>
                  <SmallStat label="Revenue" value={money(person.revenue)} />
                  <SmallStat label="Avg ticket" value={money(person.averageTicket)} />
                  <SmallStat label="Tips" value={money(person.tips)} />
                  <SmallStat label="Complete" value={String(person.completed)} />
                </article>
              ))}
            </div>
          </section>

          <section id="expenses" className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Create expense</h2>
            <form action={addExpense} className="mt-5 space-y-3">
              <input name="category" defaultValue="Marketing" className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm" placeholder="Category" />
              <input name="description" defaultValue="Campaign expense" className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm" placeholder="Description" />
              <input name="supplier" className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm" placeholder="Supplier" />
              <div className="grid grid-cols-2 gap-3">
                <input name="amount" type="number" step="0.01" defaultValue={100} className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm" />
                <input name="expenseDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm" />
              </div>
              <button disabled={expenseBusy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#173d35] px-4 py-3 font-bold text-white disabled:cursor-wait disabled:bg-[#6b7772]"><Plus size={17} /> {expenseBusy ? "Saving..." : "Save expense"}</button>
            </form>
            {expenseMessage ? <p className="mt-3 rounded-xl bg-[#eef4ef] px-4 py-3 text-sm font-semibold">{expenseMessage}</p> : null}
            <div className="mt-5 space-y-2">
              {data.expenses.slice(0, 5).map((expense) => (
                <div key={String(expense.id)} className="flex items-center justify-between rounded-xl border border-black/10 p-3 text-sm">
                  <div><p className="font-semibold">{String(expense.category)}</p><p className="text-[#52605b]">{String(expense.description)}</p></div>
                  <strong>{money(Number(expense.amount))}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section id="services" className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Service performance</h2>
            <div className="mt-5 space-y-3">
              {data.revenueByService.map((service) => (
                <div key={service.serviceId} className="flex items-center justify-between rounded-xl border border-black/10 p-4">
                  <div><p className="font-semibold">{service.name}</p><p className="text-sm text-[#52605b]">{service.bookings} bookings</p></div>
                  <strong>{money(service.revenue)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section id="payments" className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Payments</h2>
            <div className="mt-5 space-y-3">
              {data.transactions.slice(0, 8).map((transaction) => (
                <div key={String(transaction.id)} className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-black/10 p-4 text-sm">
                  <div>
                    <p className="font-semibold">{String(transaction.payment_method)} · {String(transaction.payment_status)}</p>
                    <p className="text-[#52605b]">Staff {String(transaction.staff_id)} · Tip {money(Number(transaction.tip))}</p>
                  </div>
                  <strong>{money(Number(transaction.amount))}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section id="customers" className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Customers and appointment history</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="text-[#52605b]">
                <tr>{["Customer", "Phone", "Email", "Service", "Employee", "Date", "Status"].map((heading) => <th key={heading} className="border-b border-black/10 py-3">{heading}</th>)}</tr>
              </thead>
              <tbody>
                {data.appointments.slice(0, 20).map((appointment) => (
                  <tr key={appointment.appointmentId}>
                    <td className="border-b border-black/5 py-3 font-semibold">{appointment.customer}</td>
                    <td className="border-b border-black/5 py-3">{appointment.phone}</td>
                    <td className="border-b border-black/5 py-3">{appointment.email}</td>
                    <td className="border-b border-black/5 py-3">{appointment.serviceName}</td>
                    <td className="border-b border-black/5 py-3">{appointment.staffFirstName}</td>
                    <td className="border-b border-black/5 py-3">{appointment.date}</td>
                    <td className="border-b border-black/5 py-3"><Badge>{appointment.status.replace("_", " ")}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-[#52605b]">{icon}<p className="text-xs font-bold uppercase tracking-wider">{label}</p></div><p className="mt-4 text-3xl font-semibold">{value}</p></article>;
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase tracking-wider text-[#6b7772]">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}

function AppointmentRow({ appointment }: { appointment: AdminAppointment }) {
  return (
    <tr>
      <td className="border-b border-black/5 py-3 font-semibold">{appointment.customer}</td>
      <td className="border-b border-black/5 py-3">{appointment.serviceName}</td>
      <td className="border-b border-black/5 py-3">{appointment.staffFirstName}</td>
      <td className="border-b border-black/5 py-3">{appointment.date}</td>
      <td className="border-b border-black/5 py-3">{appointment.start}-{appointment.end}</td>
      <td className="border-b border-black/5 py-3">{money(appointment.price)}</td>
      <td className="border-b border-black/5 py-3"><Badge>{appointment.status.replace("_", " ")}</Badge></td>
    </tr>
  );
}

function StatusPills({ completed, cancelled, noShow }: { completed: number; cancelled: number; noShow: number }) {
  return <div className="flex flex-wrap gap-2 text-xs font-bold"><Badge>Completed {completed}</Badge><Badge>Cancelled {cancelled}</Badge><Badge>No show {noShow}</Badge></div>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-full bg-[#f0e7dc] px-3 py-1 text-xs font-bold text-[#684d3e]">{children}</span>;
}

function money(value: number) {
  return `EUR ${Math.round(value).toLocaleString("en-BE")}`;
}
