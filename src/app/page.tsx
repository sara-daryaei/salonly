import Link from "next/link";
import { Award, CalendarCheck, Gem, HeartHandshake, Leaf, MapPin } from "lucide-react";
import { Eyebrow, MapBlock, PublicPage, RatingLine } from "@/components/public-shell";
import { ServiceCard } from "@/components/service-card";
import { localeFromSearchParams, localizedHref, ui } from "@/lib/i18n";
import { gallery, reviews, salon, services, staff } from "@/lib/salon-data";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: PageProps) {
  const locale = localeFromSearchParams(await searchParams);
  const copy = ui[locale];
  const reasons = locale === "nl"
    ? ["Ervaren Professionals", "Premium Haarproducten", "Persoonlijk Advies", "Rustige Sfeer", "Online Boeken", "Centrale Locatie in Brussel"]
    : ["Experienced Professionals", "Premium Hair Products", "Personal Consultation", "Relaxing Atmosphere", "Online Booking", "Central Brussels Location"];

  return (
    <PublicPage locale={locale}>
      <section className="relative min-h-[760px] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${salon.heroImage})` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2f2118]/85 via-[#2f2118]/45 to-transparent" />
        <div className="relative mx-auto flex min-h-[760px] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-[#fffaf4]">
            <Eyebrow>{copy.home.eyebrow}</Eyebrow>
            <h1 className="mt-5 max-w-2xl font-serif text-6xl leading-[0.98] tracking-tight sm:text-7xl">{copy.home.title}</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#fffaf4]/80">{copy.home.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={localizedHref("/book", locale)} className="rounded-full bg-[#fffaf4] px-6 py-4 font-semibold text-[#2f2118]">{copy.nav.book}</Link>
              <Link href={localizedHref("/services", locale)} className="rounded-full border border-[#fffaf4]/35 px-6 py-4 font-semibold text-white backdrop-blur">{copy.home.discover}</Link>
            </div>
            <div className="mt-8"><RatingLine locale={locale} /></div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="overflow-hidden rounded-[2.5rem]">
          <div className="h-[560px] bg-cover bg-center" style={{ backgroundImage: `url(${salon.interiorImage})` }} />
        </div>
        <div className="self-center">
          <Eyebrow>{copy.home.welcomeEyebrow}</Eyebrow>
          <h2 className="mt-4 font-serif text-5xl leading-tight">{copy.home.welcomeTitle}</h2>
          <p className="mt-6 text-lg leading-8 text-[#68584d]">{copy.home.welcomeBody}</p>
          <p className="mt-4 leading-7 text-[#68584d]">{copy.home.welcomeBody2}</p>
        </div>
      </section>

      <section className="bg-[#fffaf4]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow>{copy.home.popular}</Eyebrow>
              <h2 className="mt-4 font-serif text-5xl">{copy.home.signature}</h2>
            </div>
            <Link href={localizedHref("/services", locale)} className="font-semibold text-[#6d4f35]">{copy.home.viewAll}</Link>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {services.slice(0, 8).map((service) => <ServiceCard key={service.id} service={service} locale={locale} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Eyebrow>{copy.home.why}</Eyebrow>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            Award,
            Gem,
            HeartHandshake,
            Leaf,
            CalendarCheck,
            MapPin,
          ].map((Icon, index) => (
            <div key={reasons[index]} className="rounded-[1.5rem] border border-[#34251c]/10 bg-[#fffaf4] p-6">
              <Icon className="text-[#9a7a58]" size={24} />
              <h3 className="mt-5 font-serif text-2xl">{reasons[index]}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#2f2118] text-[#fffaf4]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow>{copy.home.team}</Eyebrow>
              <h2 className="mt-4 font-serif text-5xl">{copy.home.teamTitle}</h2>
            </div>
            <Link href={localizedHref("/team", locale)} className="rounded-full border border-white/25 px-5 py-3 font-semibold">{copy.home.teamCta}</Link>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {staff.map((person) => (
              <article key={person.id} className="overflow-hidden rounded-[1.5rem] bg-[#fffaf4] text-[#2e211a]">
                <div className="h-72 bg-cover bg-center" style={{ backgroundImage: `url(${person.photo})` }} />
                <div className="p-5">
                  <h3 className="font-serif text-2xl">{person.firstName} {person.lastName}</h3>
                  <p className="mt-1 text-sm font-semibold text-[#9a7a58]">{person.title}</p>
                  <p className="mt-3 text-sm text-[#68584d]">{person.specialties.join(" · ")}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow>{copy.home.experience}</Eyebrow>
            <h2 className="mt-4 font-serif text-5xl">{copy.home.inside}</h2>
          </div>
          <Link href={localizedHref("/gallery", locale)} className="font-semibold text-[#6d4f35]">{copy.home.gallery}</Link>
        </div>
        <div className="mt-10 grid auto-rows-[220px] gap-4 md:grid-cols-4">
          {gallery.slice(0, 6).map((item, index) => (
            <a key={item.id} href={localizedHref(`/gallery#${item.id}`, locale)} className={`rounded-[1.5rem] bg-cover bg-center ${index === 0 || index === 3 ? "md:col-span-2 md:row-span-2" : ""}`} style={{ backgroundImage: `url(${item.image})` }} aria-label={`Open ${item.title}`} />
          ))}
        </div>
      </section>

      <section className="bg-[#fffaf4]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <Eyebrow>{copy.home.clientReviews}</Eyebrow>
          <h2 className="mt-4 font-serif text-5xl">{copy.home.reviewsTitle}</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {reviews.slice(0, 3).map((review) => (
              <article key={review.id} className="rounded-[1.5rem] border border-[#34251c]/10 bg-[#f8f3ec] p-6">
                <p className="text-[#b58b4a]">★★★★★</p>
                <p className="mt-4 leading-7 text-[#68584d]">{review.text}</p>
                <p className="mt-5 font-semibold">- {review.customer}</p>
              </article>
            ))}
          </div>
          <Link href={localizedHref("/reviews", locale)} className="mt-8 inline-flex rounded-full bg-[#2f2118] px-5 py-3 font-semibold text-white">{copy.home.reviewsCta}</Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-[2.5rem] bg-cover bg-center p-8 text-white sm:p-12" style={{ backgroundImage: `linear-gradient(90deg, rgba(47,33,24,.88), rgba(47,33,24,.35)), url(${salon.philosophyImage})` }}>
          <Eyebrow>{copy.home.ready}</Eyebrow>
          <h2 className="mt-4 max-w-2xl font-serif text-5xl">{copy.home.readyTitle}</h2>
          <Link href={localizedHref("/book", locale)} className="mt-8 inline-flex rounded-full bg-[#fffaf4] px-6 py-4 font-semibold text-[#2f2118]">{copy.nav.book}</Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-24 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <Eyebrow>{copy.home.location}</Eyebrow>
          <h2 className="mt-4 font-serif text-5xl">{salon.displayName}</h2>
          <p className="mt-5 text-lg text-[#68584d]">{salon.address}</p>
          <p className="mt-4 text-[#68584d]">{salon.phone}<br />{salon.email}</p>
          <div className="mt-8 grid gap-2 text-sm text-[#68584d]">
            {Object.entries(salon.hours).map(([day, time]) => <div key={day} className="flex justify-between border-b border-[#34251c]/10 py-2"><span>{day}</span><strong>{time}</strong></div>)}
          </div>
        </div>
        <MapBlock />
      </section>
    </PublicPage>
  );
}
