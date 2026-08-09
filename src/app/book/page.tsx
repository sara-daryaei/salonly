import { Suspense } from "react";
import { BookingFlow } from "@/components/booking-flow";
import { Eyebrow, PublicPage } from "@/components/public-shell";

export default function BookingPage() {
  return (
    <PublicPage>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Eyebrow>Book appointment</Eyebrow>
        <h1 className="mt-4 max-w-3xl font-serif text-6xl leading-tight">Reserve your visit directly with Maison Elegance.</h1>
      </section>
      <Suspense fallback={<div className="mx-auto max-w-7xl px-4 pb-24 text-[#68584d] sm:px-6 lg:px-8">Loading booking flow...</div>}>
        <BookingFlow />
      </Suspense>
    </PublicPage>
  );
}
