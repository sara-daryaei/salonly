import Link from "next/link";
import { CalendarX, RefreshCw, Star, UserRound } from "lucide-react";
import { PublicPage, Eyebrow } from "@/components/public-shell";
import { localeFromSearchParams } from "@/lib/i18n";
import { appointments, serviceById, staffById } from "@/lib/salon-data";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccountPage({ searchParams }: PageProps) {
  const locale = localeFromSearchParams(await searchParams);
  const upcoming = appointments.filter((appointment) => ["pending", "confirmed"].includes(appointment.status)).slice(0, 5);
  const past = appointments.filter((appointment) => appointment.status === "completed").slice(0, 4);
  const cancelled = appointments.filter((appointment) => appointment.status === "cancelled");

  return (
    <PublicPage locale={locale}>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          <aside className="h-max rounded-[2rem] border border-[#34251c]/10 bg-[#fffaf4] p-6">
            <UserRound size={30} className="text-[#9a7a58]" />
            <h1 className="mt-4 font-serif text-4xl">Client account</h1>
            <p className="mt-3 text-sm leading-6 text-[#68584d]">Register or login to manage appointments, reviews and profile details.</p>
            {["Upcoming Appointments", "Past Appointments", "Cancelled Appointments", "Reviews", "Profile"].map((item) => (
              <button key={item} className="mt-2 block w-full rounded-2xl px-3 py-3 text-left text-sm font-semibold text-[#68584d] hover:bg-[#f1e8db]">{item}</button>
            ))}
          </aside>
          <div className="space-y-6">
            <AccountSection title="Upcoming Appointments">
              {upcoming.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} actions />)}
            </AccountSection>
            <AccountSection title="Past Appointments">
              {past.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} review />)}
            </AccountSection>
            <AccountSection title="Cancelled Appointments">
              {cancelled.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} />)}
            </AccountSection>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}

function AccountSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-[2rem] border border-[#34251c]/10 bg-[#fffaf4] p-6"><Eyebrow>{title}</Eyebrow><div className="mt-5 space-y-3">{children}</div></section>;
}

function AppointmentCard({ appointment, actions, review }: { appointment: (typeof appointments)[number]; actions?: boolean; review?: boolean }) {
  const service = serviceById(appointment.serviceId);
  const person = staffById(appointment.staffId);
  return (
    <article className="grid gap-4 rounded-2xl border border-[#34251c]/10 bg-white p-4 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{service.name}</h3>
          <span className="rounded-full bg-[#f1e8db] px-3 py-1 text-xs font-semibold text-[#6d4f35]">{appointment.status}</span>
        </div>
        <p className="mt-2 text-sm text-[#68584d]">{appointment.date} · {appointment.start}-{appointment.end} · {person.firstName} · €{appointment.price}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions ? <><button className="inline-flex items-center gap-2 rounded-full border border-[#34251c]/10 px-3 py-2 text-sm font-semibold"><CalendarX size={15} /> Cancel</button><button className="inline-flex items-center gap-2 rounded-full bg-[#2f2118] px-3 py-2 text-sm font-semibold text-white"><RefreshCw size={15} /> Reschedule</button></> : null}
        {review ? <Link href="/reviews" className="inline-flex items-center gap-2 rounded-full bg-[#2f2118] px-3 py-2 text-sm font-semibold text-white"><Star size={15} /> Review</Link> : null}
      </div>
    </article>
  );
}
