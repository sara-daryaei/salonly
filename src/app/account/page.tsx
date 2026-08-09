import { AccountDashboard } from "@/components/account-dashboard";
import { PublicPage } from "@/components/public-shell";
import { localeFromSearchParams } from "@/lib/i18n";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccountPage({ searchParams }: PageProps) {
  const locale = localeFromSearchParams(await searchParams);

  return (
    <PublicPage locale={locale}>
      <AccountDashboard locale={locale} />
    </PublicPage>
  );
}
