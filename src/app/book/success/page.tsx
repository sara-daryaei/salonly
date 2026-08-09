import { Suspense } from "react";
import { BookingSuccess } from "@/components/booking-success";
import { PublicPage } from "@/components/public-shell";
import { localeFromSearchParams } from "@/lib/i18n";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BookingSuccessPage({ searchParams }: PageProps) {
  const locale = localeFromSearchParams(await searchParams);
  const loading = locale === "nl" ? "Afspraak laden..." : "Loading appointment...";

  return (
    <PublicPage locale={locale}>
      <Suspense fallback={<section className="mx-auto max-w-3xl px-4 py-24 text-center text-[#68584d] sm:px-6 lg:px-8">{loading}</section>}>
        <BookingSuccess />
      </Suspense>
    </PublicPage>
  );
}
