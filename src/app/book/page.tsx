import { Suspense } from "react";
import { BookingFlow } from "@/components/booking-flow";
import { Eyebrow, PublicPage } from "@/components/public-shell";
import { localeFromSearchParams, ui } from "@/lib/i18n";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BookingPage({ searchParams }: PageProps) {
  const locale = localeFromSearchParams(await searchParams);
  const copy = ui[locale].bookPage;

  return (
    <PublicPage locale={locale}>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <h1 className="mt-4 max-w-3xl font-serif text-6xl leading-tight">{copy.title}</h1>
      </section>
      <Suspense fallback={<div className="mx-auto max-w-7xl px-4 pb-24 text-[#68584d] sm:px-6 lg:px-8">{copy.loading}</div>}>
        <BookingFlow />
      </Suspense>
    </PublicPage>
  );
}
