import Link from "next/link";
import { Eyebrow, PublicPage } from "@/components/public-shell";
import { localeFromSearchParams, localizedHref, serviceText } from "@/lib/i18n";
import { serviceById, staff } from "@/lib/salon-data";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TeamPage({ searchParams }: PageProps) {
  const locale = localeFromSearchParams(await searchParams);
  const nl = locale === "nl";

  return (
    <PublicPage locale={locale}>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Eyebrow>{nl ? "Salonteam" : "Salon team"}</Eyebrow>
        <h1 className="mt-4 font-serif text-6xl">{nl ? "Ontmoet de mensen achter je haar." : "Meet the people behind your hair."}</h1>
      </section>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-24 sm:px-6 lg:px-8">
        {staff.map((person) => (
          <article key={person.id} className="grid overflow-hidden rounded-[2rem] border border-[#34251c]/10 bg-[#fffaf4] md:grid-cols-[380px_1fr]">
            <div className="min-h-96 bg-cover bg-center" style={{ backgroundImage: `url(${person.photo})` }} />
            <div className="p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#9a7a58]">{person.experience}</p>
              <h2 className="mt-3 font-serif text-4xl">{person.firstName} {person.lastName}</h2>
              <p className="mt-2 text-lg font-semibold text-[#6d4f35]">{person.title}</p>
              <p className="mt-5 max-w-2xl leading-7 text-[#68584d]">{person.bio}</p>
              <div className="mt-6 grid gap-6 md:grid-cols-3">
                <Info title={nl ? "Specialiteiten" : "Specialties"} items={person.specialties} />
                <Info title={nl ? "Talen" : "Languages"} items={person.languages} />
                <Info title={nl ? "Diensten" : "Services"} items={person.services.map((id) => serviceText(serviceById(id), locale).name)} />
              </div>
              <Link href={localizedHref(`/book?staff=${person.id}`, locale)} className="mt-8 inline-flex rounded-full bg-[#2f2118] px-5 py-3 font-semibold text-white">{nl ? `Boek bij ${person.firstName}` : `Book with ${person.firstName}`}</Link>
            </div>
          </article>
        ))}
      </section>
    </PublicPage>
  );
}

function Info({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-[#68584d]">{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}
