import { PublicPage } from "@/components/public-shell";
import { ReviewsDashboard } from "@/components/reviews-dashboard";
import { localeFromSearchParams } from "@/lib/i18n";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReviewsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const locale = localeFromSearchParams(params);
  const appointment = Array.isArray(params?.appointment) ? params?.appointment[0] : params?.appointment;

  return (
    <PublicPage locale={locale}>
      <ReviewsDashboard locale={locale} initialAppointment={appointment} />
    </PublicPage>
  );
}
