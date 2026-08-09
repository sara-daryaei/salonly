import { Suspense } from "react";
import { BookingSuccess } from "@/components/booking-success";
import { PublicPage } from "@/components/public-shell";

export default function BookingSuccessPage() {
  return (
    <PublicPage>
      <Suspense fallback={<section className="mx-auto max-w-3xl px-4 py-24 text-center text-[#68584d] sm:px-6 lg:px-8">Loading appointment...</section>}>
        <BookingSuccess />
      </Suspense>
    </PublicPage>
  );
}
