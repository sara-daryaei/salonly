import { PublicPage, Eyebrow } from "@/components/public-shell";
import { ServiceCard } from "@/components/service-card";
import { localeFromSearchParams, serviceCategoryLabels, ui } from "@/lib/i18n";
import { serviceCategories, services } from "@/lib/salon-data";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ServicesPage({ searchParams }: PageProps) {
  const locale = localeFromSearchParams(await searchParams);
  const copy = ui[locale].servicesPage;

  return (
    <PublicPage locale={locale}>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <h1 className="mt-4 max-w-3xl font-serif text-6xl leading-tight">{copy.title}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#68584d]">{copy.body}</p>
      </section>
      <section className="mx-auto max-w-7xl space-y-16 px-4 pb-24 sm:px-6 lg:px-8">
        {serviceCategories.map((category) => (
          <div key={category}>
            <h2 className="font-serif text-4xl">{serviceCategoryLabels[locale][category]}</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {services.filter((service) => service.category === category).map((service) => <ServiceCard key={service.id} service={service} locale={locale} />)}
            </div>
          </div>
        ))}
      </section>
    </PublicPage>
  );
}
