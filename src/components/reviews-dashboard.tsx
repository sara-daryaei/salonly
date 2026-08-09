"use client";

import { useEffect, useMemo, useState } from "react";
import { Eyebrow, RatingLine } from "@/components/public-shell";
import type { Locale } from "@/lib/i18n";
import { appointments, reviews as seedReviews, type Review } from "@/lib/salon-data";

type FilterMode = "recent" | "highest";

type ReviewCopy = {
  eyebrow: string;
  recent: string;
  highest: string;
  completedOnly: string;
  leave: string;
  productionNote: string;
  selectedAppointment: string;
  noAppointment: string;
  placeholder: string;
  submit: string;
  submitted: string;
  required: string;
  salonResponse: string;
};

const copyByLocale: Record<Locale, ReviewCopy> = {
  en: {
    eyebrow: "Customer reviews",
    recent: "Most Recent",
    highest: "Highest Rating",
    completedOnly: "Completed appointments only",
    leave: "Leave a review",
    productionNote: "Select a completed appointment, choose a rating and submit your experience.",
    selectedAppointment: "Appointment",
    noAppointment: "Choose a completed appointment",
    placeholder: "Share your experience",
    submit: "Submit Review",
    submitted: "Your review has been added.",
    required: "Please choose an appointment and write a short review.",
    salonResponse: "Salon response",
  },
  nl: {
    eyebrow: "Klantreviews",
    recent: "Meest recent",
    highest: "Hoogste score",
    completedOnly: "Alleen voltooide afspraken",
    leave: "Laat een review achter",
    productionNote: "Kies een voltooide afspraak, geef een score en deel je ervaring.",
    selectedAppointment: "Afspraak",
    noAppointment: "Kies een voltooide afspraak",
    placeholder: "Deel je ervaring",
    submit: "Review Versturen",
    submitted: "Je review is toegevoegd.",
    required: "Kies een afspraak en schrijf een korte review.",
    salonResponse: "Reactie salon",
  },
};

const storageKey = "maison-elegance-client-reviews";

export function ReviewsDashboard({ locale, initialAppointment }: { locale: Locale; initialAppointment?: string }) {
  const copy = copyByLocale[locale];
  const completedAppointments = appointments.filter((appointment) => appointment.status === "completed");
  const [reviews, setReviews] = useStoredReviews();
  const [filter, setFilter] = useState<FilterMode>("recent");
  const [rating, setRating] = useState(5);
  const [appointmentReference, setAppointmentReference] = useState(initialAppointment ?? completedAppointments[0]?.reference ?? "");
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const visibleReviews = useMemo(() => {
    const items = [...reviews];
    if (filter === "highest") {
      return items.sort((a, b) => b.rating - a.rating || b.date.localeCompare(a.date));
    }
    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [filter, reviews]);

  function submitReview() {
    setMessage("");
    setError("");
    const appointment = completedAppointments.find((item) => item.reference === appointmentReference);
    if (!appointment || text.trim().length < 4) {
      setError(copy.required);
      return;
    }

    const review: Review = {
      id: `local-${crypto.randomUUID()}`,
      customer: appointment.customer,
      rating,
      date: new Date().toISOString().slice(0, 10),
      text: text.trim(),
      appointmentStatus: "completed",
    };
    setReviews((items) => [review, ...items]);
    setFilter("recent");
    setText("");
    setMessage(copy.submitted);
  }

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <h1 className="mt-4 font-serif text-6xl">{averageRating(reviews)} / 5</h1>
        <div className="mt-5"><RatingLine locale={locale} /></div>
        <div className="mt-8 flex gap-3">
          {[
            ["recent", copy.recent],
            ["highest", copy.highest],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value as FilterMode)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${filter === value ? "border-[#2f2118] bg-[#2f2118] text-white" : "border-[#34251c]/10 bg-[#fffaf4] text-[#68584d]"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-16 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
        {visibleReviews.map((review) => (
          <article key={review.id} className="rounded-[1.5rem] border border-[#34251c]/10 bg-[#fffaf4] p-6">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{review.customer}</p>
              <p className="text-sm text-[#9a7a58]">{review.date}</p>
            </div>
            <p className="mt-3 text-[#b58b4a]">{"★".repeat(review.rating)}<span className="text-[#d8c9b4]">{"★".repeat(5 - review.rating)}</span></p>
            <p className="mt-4 leading-7 text-[#68584d]">{review.text}</p>
            {review.response ? <p className="mt-4 rounded-2xl bg-[#f1e8db] p-4 text-sm text-[#6d4f35]">{copy.salonResponse}: {review.response}</p> : null}
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-[#34251c]/10 bg-[#fffaf4] p-8">
          <Eyebrow>{copy.completedOnly}</Eyebrow>
          <h2 className="mt-4 font-serif text-4xl">{copy.leave}</h2>
          <p className="mt-3 text-sm leading-6 text-[#68584d]">{copy.productionNote}</p>
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-[#68584d]">
              {copy.selectedAppointment}
              <select value={appointmentReference} onChange={(event) => setAppointmentReference(event.target.value)} className="rounded-2xl border border-[#34251c]/10 bg-white px-4 py-3 text-[#2e211a]">
                <option value="">{copy.noAppointment}</option>
                {completedAppointments.map((appointment) => (
                  <option key={appointment.reference} value={appointment.reference}>{appointment.reference} · {appointment.date} · {appointment.customer}</option>
                ))}
              </select>
            </label>
            <select value={rating} onChange={(event) => setRating(Number(event.target.value))} className="rounded-2xl border border-[#34251c]/10 bg-white px-4 py-3">
              {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
            </select>
            <textarea value={text} onChange={(event) => setText(event.target.value)} className="min-h-32 rounded-2xl border border-[#34251c]/10 bg-white px-4 py-3" placeholder={copy.placeholder} />
            {error ? <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
            {message ? <p className="rounded-2xl bg-[#f1e8db] p-3 text-sm font-semibold text-[#6d4f35]">{message}</p> : null}
            <button onClick={submitReview} className="rounded-full bg-[#2f2118] px-5 py-3 font-semibold text-white">{copy.submit}</button>
          </div>
        </div>
      </section>
    </>
  );
}

function useStoredReviews() {
  const [reviews, setReviews] = useState<Review[]>(() => {
    if (typeof window === "undefined") return seedReviews;
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return seedReviews;
    try {
      return JSON.parse(stored) as Review[];
    } catch {
      return seedReviews;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(reviews));
  }, [reviews]);

  return [reviews, setReviews] as const;
}

function averageRating(reviews: Review[]) {
  if (!reviews.length) return "0.0";
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return (total / reviews.length).toFixed(1);
}
