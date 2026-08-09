"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Search } from "lucide-react";
import { appointments as seedAppointments, reviews, salon, serviceById, services, staff, staffById, type Appointment } from "@/lib/salon-data";

export function AdminDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>(seedAppointments);

  useEffect(() => {
    fetch("/api/bookings")
      .then((response) => response.json())
      .then((data) => setAppointments(data.appointments ?? seedAppointments));
  }, []);

  const weekAppointments = appointments.filter((appointment) => appointment.date >= "2026-08-12");
  const completed = appointments.filter((appointment) => appointment.status === "completed");
  const revenue = completed.reduce((sum, appointment) => sum + appointment.price, 0);

  const customerRows = useMemo(() => {
    const byCustomer = new Map<string, { count: number; total: number; last: string; phone: string; email: string }>();
    for (const appointment of appointments) {
      const current = byCustomer.get(appointment.customer) ?? { count: 0, total: 0, last: appointment.date, phone: appointment.phone, email: appointment.email };
      current.count += 1;
      current.total += appointment.price;
      current.last = appointment.date > current.last ? appointment.date : current.last;
      byCustomer.set(appointment.customer, current);
    }
    return Array.from(byCustomer.entries()).slice(0, 6);
  }, [appointments]);

  return (
    <>
      <header className="border-b border-black/10 bg-white px-5 py-5 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6b7772]">Private salon administration</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Maison Elegance dashboard</h1>
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl bg-[#173d35] px-4 py-3 text-sm font-semibold text-white"><CalendarPlus size={17} /> Create appointment</button>
        </div>
      </header>
      <div className="space-y-6 p-5 lg:p-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Metric label="Today's Appointments" value={appointments.filter((appointment) => appointment.date === "2026-08-12").length.toString()} />
          <Metric label="This Week" value={weekAppointments.length.toString()} />
          <Metric label="New Customers" value={customerRows.length.toString()} />
          <Metric label="Monthly Revenue" value={`€${(revenue + 5420).toLocaleString("en-BE")}`} />
          <Metric label="Average Review" value={salon.rating.toString()} />
          <Metric label="Upcoming" value={appointments.filter((a) => ["pending", "confirmed"].includes(a.status)).length.toString()} />
        </section>

        <section id="calendar" className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Appointment calendar</h2>
              <p className="mt-1 text-sm text-[#52605b]">Week view by stylist, using the same booking data as the public website.</p>
            </div>
            <div className="flex rounded-xl border border-black/10 p-1 text-sm font-semibold text-[#52605b]">
              {["Day", "Week", "Month"].map((view, index) => <button key={view} className={`rounded-lg px-4 py-2 ${index === 1 ? "bg-[#173d35] text-white" : ""}`}>{view}</button>)}
            </div>
          </div>
          <div className="mt-6 overflow-x-auto">
            <div className="min-w-[920px]">
              <div className="grid grid-cols-[90px_repeat(4,1fr)] border-b border-black/10 text-sm font-semibold text-[#52605b]">
                <div className="p-3">Time</div>
                {staff.map((person) => <div key={person.id} className="p-3">{person.firstName}</div>)}
              </div>
              {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"].map((time) => (
                <div key={time} className="grid min-h-24 grid-cols-[90px_repeat(4,1fr)] border-b border-black/5">
                  <div className="p-3 text-sm font-semibold text-[#52605b]">{time}</div>
                  {staff.map((person) => {
                    const blocks = appointments.filter((item) => item.staffId === person.id && item.start.startsWith(time.slice(0, 2)) && ["pending", "confirmed"].includes(item.status));
                    return <div key={`${time}-${person.id}`} className="space-y-2 p-2">{blocks.map((appointment) => <AppointmentBlock key={appointment.id} appointment={appointment} />)}</div>;
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="appointments" className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold">Appointment management</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              {["Today", "Tomorrow", "This Week", "Upcoming", "Completed", "Cancelled"].map((filter) => <button key={filter} className="rounded-lg border border-black/10 px-3 py-2 font-semibold text-[#52605b]">{filter}</button>)}
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <label className="flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-sm text-[#52605b]"><Search size={16} /> Search customer</label>
            <select className="rounded-xl border border-black/10 px-3 py-2 text-sm"><option>All employees</option></select>
            <select className="rounded-xl border border-black/10 px-3 py-2 text-sm"><option>All services</option></select>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="text-[#52605b]"><tr>{["Customer", "Phone", "Email", "Service", "Employee", "Date", "Time", "Price", "Status"].map((h) => <th key={h} className="border-b border-black/10 py-3">{h}</th>)}</tr></thead>
              <tbody>
                {appointments.slice(0, 14).map((appointment) => {
                  const service = serviceById(appointment.serviceId);
                  const person = staffById(appointment.staffId);
                  return (
                    <tr key={appointment.id}>
                      <td className="border-b border-black/5 py-3 font-semibold">{appointment.customer}</td>
                      <td className="border-b border-black/5 py-3">{appointment.phone}</td>
                      <td className="border-b border-black/5 py-3">{appointment.email}</td>
                      <td className="border-b border-black/5 py-3">{service.name}</td>
                      <td className="border-b border-black/5 py-3">{person.firstName}</td>
                      <td className="border-b border-black/5 py-3">{appointment.date}</td>
                      <td className="border-b border-black/5 py-3">{appointment.start}-{appointment.end}</td>
                      <td className="border-b border-black/5 py-3">€{appointment.price}</td>
                      <td className="border-b border-black/5 py-3"><Status status={appointment.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section id="customers" className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Customer database</h2>
            <div className="mt-5 space-y-3">
              {customerRows.map(([name, data]) => (
                <div key={name} className="grid gap-3 rounded-xl border border-black/10 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div><p className="font-semibold">{name}</p><p className="text-sm text-[#52605b]">{data.count} appointments · Last appointment {data.last} · {data.phone}</p></div>
                  <strong>€{data.total}</strong>
                </div>
              ))}
            </div>
          </section>
          <section id="services" className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Service management</h2>
            <div className="mt-5 grid gap-3">
              {services.slice(0, 7).map((service) => <div key={service.id} className="flex items-center justify-between rounded-xl border border-black/10 p-3"><div><p className="font-semibold">{service.name}</p><p className="text-sm text-[#52605b]">{service.category} · {service.duration} min · €{service.price}</p></div><span className="rounded-lg bg-[#eef4ef] px-2 py-1 text-xs font-semibold text-[#24594f]">Active</span></div>)}
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section id="reviews" className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Review management</h2>
            <div className="mt-5 space-y-3">
              {reviews.slice(0, 4).map((review) => <article key={review.id} className="rounded-xl border border-black/10 p-4"><p className="font-semibold">{review.customer} · {review.rating} stars</p><p className="mt-2 text-sm text-[#52605b]">{review.text}</p><button className="mt-3 rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold text-[#173d35]">Reply to review</button></article>)}
            </div>
          </section>
          <section id="settings" className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Salon settings</h2>
            <div className="mt-5 grid gap-3">
              {["Salon name", "Logo", "Cover image", "Description", "Address", "Phone", "Email", "Social media", "Opening hours", "Booking settings"].map((item) => <div key={item} className="rounded-xl border border-black/10 p-4"><strong>{item}</strong><p className="mt-1 text-sm text-[#52605b]">Editable from the future settings form.</p></div>)}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-[#6b7772]">{label}</p><p className="mt-4 text-3xl font-semibold">{value}</p></article>;
}

function AppointmentBlock({ appointment }: { appointment: Appointment }) {
  const service = serviceById(appointment.serviceId);
  const person = staffById(appointment.staffId);
  return (
    <div className="rounded-xl border border-[#173d35]/20 bg-[#eef4ef] p-3 text-xs shadow-sm">
      <p className="font-semibold">{appointment.start}-{appointment.end}</p>
      <p className="mt-1 font-semibold">{appointment.customer}</p>
      <p className="text-[#52605b]">{service.name} · {person.firstName}</p>
      <p className="text-[#52605b]">{appointment.phone} · {appointment.email}</p>
      <Status status={appointment.status} />
    </div>
  );
}

function Status({ status }: { status: string }) {
  return <span className="mt-2 inline-flex rounded-lg bg-white px-2 py-1 text-xs font-semibold text-[#173d35]">{status.replace("_", " ")}</span>;
}
