"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarX, RefreshCw, Star, UserRound } from "lucide-react";
import { Eyebrow } from "@/components/public-shell";
import { localizedHref, serviceText, type Locale } from "@/lib/i18n";
import { appointments as seedAppointments, serviceById, staffById, type Appointment } from "@/lib/salon-data";

type AccountCopy = {
  title: string;
  intro: string;
  upcoming: string;
  past: string;
  cancelled: string;
  reviews: string;
  profile: string;
  cancel: string;
  reschedule: string;
  review: string;
  emptyUpcoming: string;
  emptyCancelled: string;
};

const copyByLocale: Record<Locale, AccountCopy> = {
  en: {
    title: "Client account",
    intro: "Register or login to manage appointments, reviews and profile details.",
    upcoming: "Upcoming Appointments",
    past: "Past Appointments",
    cancelled: "Cancelled Appointments",
    reviews: "Reviews",
    profile: "Profile",
    cancel: "Cancel",
    reschedule: "Reschedule",
    review: "Review",
    emptyUpcoming: "No upcoming appointments.",
    emptyCancelled: "No cancelled appointments.",
  },
  nl: {
    title: "Klantaccount",
    intro: "Registreer of log in om afspraken, reviews en profielgegevens te beheren.",
    upcoming: "Komende afspraken",
    past: "Vorige afspraken",
    cancelled: "Geannuleerde afspraken",
    reviews: "Reviews",
    profile: "Profiel",
    cancel: "Annuleren",
    reschedule: "Verplaatsen",
    review: "Review",
    emptyUpcoming: "Geen komende afspraken.",
    emptyCancelled: "Geen geannuleerde afspraken.",
  },
};

const storageKey = "maison-elegance-account-appointments";

export function AccountDashboard({ locale }: { locale: Locale }) {
  const copy = copyByLocale[locale];
  const [appointments, setAppointments] = useStoredAppointments();
  const [notice, setNotice] = useState("");
  const upcoming = appointments.filter((appointment) => ["pending", "confirmed"].includes(appointment.status)).slice(0, 5);
  const past = appointments.filter((appointment) => appointment.status === "completed").slice(0, 4);
  const cancelled = appointments.filter((appointment) => appointment.status === "cancelled");

  function cancelAppointment(id: string) {
    const appointment = appointments.find((item) => item.id === id);
    setAppointments((items) => items.map((item) => item.id === id ? { ...item, status: "cancelled" } : item));
    setNotice(appointment ? `${serviceText(serviceById(appointment.serviceId), locale).name} ${locale === "nl" ? "is geannuleerd." : "has been cancelled."}` : "");
    document.getElementById("cancelled-appointments")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        <aside className="h-max rounded-[2rem] border border-[#34251c]/10 bg-[#fffaf4] p-6 lg:sticky lg:top-24">
          <UserRound size={30} className="text-[#9a7a58]" />
          <h1 className="mt-4 font-serif text-4xl">{copy.title}</h1>
          <p className="mt-3 text-sm leading-6 text-[#68584d]">{copy.intro}</p>
          {[
            [copy.upcoming, "upcoming-appointments"],
            [copy.past, "past-appointments"],
            [copy.cancelled, "cancelled-appointments"],
            [copy.reviews, "reviews-panel"],
            [copy.profile, "profile-panel"],
          ].map(([label, target]) => (
            <button key={target} onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" })} className="mt-2 block w-full rounded-2xl px-3 py-3 text-left text-sm font-semibold text-[#68584d] hover:bg-[#f1e8db]">
              {label}
            </button>
          ))}
        </aside>
        <div className="space-y-6">
          {notice ? <p className="rounded-2xl border border-[#34251c]/10 bg-[#f1e8db] px-5 py-4 text-sm font-semibold text-[#6d4f35]">{notice}</p> : null}
          <AccountSection id="upcoming-appointments" title={copy.upcoming}>
            {upcoming.length ? upcoming.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} locale={locale} copy={copy} onCancel={cancelAppointment} actions />) : <EmptyState>{copy.emptyUpcoming}</EmptyState>}
          </AccountSection>
          <AccountSection id="past-appointments" title={copy.past}>
            {past.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} locale={locale} copy={copy} review />)}
          </AccountSection>
          <AccountSection id="cancelled-appointments" title={copy.cancelled}>
            {cancelled.length ? cancelled.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} locale={locale} copy={copy} />) : <EmptyState>{copy.emptyCancelled}</EmptyState>}
          </AccountSection>
          <AccountSection id="reviews-panel" title={copy.reviews}>
            <Link href={localizedHref("/reviews", locale)} className="inline-flex rounded-full bg-[#2f2118] px-5 py-3 font-semibold text-white">{copy.reviews}</Link>
          </AccountSection>
          <AccountSection id="profile-panel" title={copy.profile}>
            <div className="grid gap-3 md:grid-cols-2">
              <input className="rounded-2xl border border-[#34251c]/10 bg-white px-4 py-3" defaultValue="Emma D." />
              <input className="rounded-2xl border border-[#34251c]/10 bg-white px-4 py-3" defaultValue="emma.d@example.com" />
            </div>
          </AccountSection>
        </div>
      </div>
    </section>
  );
}

function useStoredAppointments() {
  const [appointments, setAppointments] = useStateWithLocalStorage<Appointment[]>(storageKey, seedAppointments);
  return [appointments, setAppointments] as const;
}

function useStateWithLocalStorage<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return fallback;
    const stored = window.localStorage.getItem(key);
    if (!stored) return fallback;
    try {
      return JSON.parse(stored) as T;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

function AccountSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-24 rounded-[2rem] border border-[#34251c]/10 bg-[#fffaf4] p-6"><Eyebrow>{title}</Eyebrow><div className="mt-5 space-y-3">{children}</div></section>;
}

function AppointmentCard({ appointment, locale, copy, actions, review, onCancel }: { appointment: Appointment; locale: Locale; copy: AccountCopy; actions?: boolean; review?: boolean; onCancel?: (id: string) => void }) {
  const service = serviceById(appointment.serviceId);
  const person = staffById(appointment.staffId);
  return (
    <article className="grid gap-4 rounded-2xl border border-[#34251c]/10 bg-white p-4 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{serviceText(service, locale).name}</h3>
          <span className="rounded-full bg-[#f1e8db] px-3 py-1 text-xs font-semibold text-[#6d4f35]">{appointment.status}</span>
        </div>
        <p className="mt-2 text-sm text-[#68584d]">{appointment.date} · {appointment.start}-{appointment.end} · {person.firstName} · €{appointment.price}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions ? <>
          <button onClick={() => onCancel?.(appointment.id)} className="inline-flex items-center gap-2 rounded-full border border-[#34251c]/10 px-3 py-2 text-sm font-semibold"><CalendarX size={15} /> {copy.cancel}</button>
          <Link href={localizedHref(`/book?service=${appointment.serviceId}&staff=${appointment.staffId}`, locale)} className="inline-flex items-center gap-2 rounded-full bg-[#2f2118] px-3 py-2 text-sm font-semibold text-white"><RefreshCw size={15} /> {copy.reschedule}</Link>
        </> : null}
        {review ? <Link href={localizedHref(`/reviews?appointment=${appointment.reference}`, locale)} className="inline-flex items-center gap-2 rounded-full bg-[#2f2118] px-3 py-2 text-sm font-semibold text-white"><Star size={15} /> {copy.review}</Link> : null}
      </div>
    </article>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-[#34251c]/20 bg-white/60 p-5 text-sm text-[#68584d]">{children}</p>;
}
