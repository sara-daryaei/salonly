"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarPlus, CheckCircle2 } from "lucide-react";
import { Eyebrow } from "@/components/public-shell";
import { formatDisplayDate } from "@/lib/availability";
import { salon, serviceById, staffById, type Appointment } from "@/lib/salon-data";

export function BookingSuccess() {
  const reference = useSearchParams().get("reference");
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(Boolean(reference));

  useEffect(() => {
    if (!reference) return;

    fetch(`/api/bookings?reference=${encodeURIComponent(reference)}`)
      .then((response) => response.json())
      .then((data) => setAppointment(data.appointment ?? null))
      .finally(() => setLoading(false));
  }, [reference]);

  if (loading) {
    return <section className="mx-auto max-w-3xl px-4 py-24 text-center text-[#68584d] sm:px-6 lg:px-8">Loading appointment...</section>;
  }

  if (!appointment) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <Eyebrow>Booking not found</Eyebrow>
        <h1 className="mt-4 font-serif text-5xl">We could not find this appointment.</h1>
        <Link href="/book" className="mt-8 inline-flex rounded-full bg-[#2f2118] px-5 py-3 font-semibold text-white">Return to booking</Link>
      </section>
    );
  }

  const service = serviceById(appointment.serviceId);
  const person = staffById(appointment.staffId);

  return (
    <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
      <CheckCircle2 className="mx-auto text-[#6d4f35]" size={64} />
      <Eyebrow>Appointment confirmed</Eyebrow>
      <h1 className="mt-4 font-serif text-6xl">We look forward to welcoming you.</h1>
      <div className="mt-8 rounded-[2rem] border border-[#34251c]/10 bg-[#fffaf4] p-6 text-left">
        <Summary label="Booking Reference" value={appointment.reference} />
        <Summary label="Service" value={service.name} />
        <Summary label="Professional" value={`${person.firstName} ${person.lastName}`} />
        <Summary label="Date" value={formatDisplayDate(appointment.date)} />
        <Summary label="Time" value={`${appointment.start}-${appointment.end}`} />
        <Summary label="Duration" value={`${appointment.duration} min`} />
        <Summary label="Price" value={`€${appointment.price}`} />
        <Summary label="Customer" value={appointment.customer} />
        <Summary label="Salon" value={`${salon.displayName}, Avenue Louise 120, 1050 Brussels`} />
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button className="inline-flex items-center gap-2 rounded-full bg-[#2f2118] px-5 py-3 font-semibold text-white"><CalendarPlus size={18} /> Add to Calendar</button>
        <Link href="/account" className="rounded-full border border-[#34251c]/15 px-5 py-3 font-semibold text-[#2f2118]">My Appointments</Link>
        <Link href="/" className="rounded-full border border-[#34251c]/15 px-5 py-3 font-semibold text-[#2f2118]">Back to Home</Link>
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-2 border-b border-[#34251c]/10 py-3 sm:grid-cols-[180px_1fr]"><span className="text-[#68584d]">{label}</span><strong>{value}</strong></div>;
}
