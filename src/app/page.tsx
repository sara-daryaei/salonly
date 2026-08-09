import Link from "next/link";
import { Award, CalendarCheck, Gem, HeartHandshake, Leaf, MapPin } from "lucide-react";
import { Eyebrow, MapBlock, PublicPage, RatingLine } from "@/components/public-shell";
import { ServiceCard } from "@/components/service-card";
import { gallery, reviews, salon, services, staff } from "@/lib/salon-data";

export default function Home() {
  return (
    <PublicPage>
      <section className="relative min-h-[760px] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${salon.heroImage})` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2f2118]/85 via-[#2f2118]/45 to-transparent" />
        <div className="relative mx-auto flex min-h-[760px] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-[#fffaf4]">
            <Eyebrow>Premium hair salon in Brussels</Eyebrow>
            <h1 className="mt-5 max-w-2xl font-serif text-6xl leading-[0.98] tracking-tight sm:text-7xl">Beautiful Hair. Personal Experience.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#fffaf4]/80">Professional hair care and styling in the heart of Brussels.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book" className="rounded-full bg-[#fffaf4] px-6 py-4 font-semibold text-[#2f2118]">Book Appointment</Link>
              <Link href="/services" className="rounded-full border border-[#fffaf4]/35 px-6 py-4 font-semibold text-white backdrop-blur">Discover Our Services</Link>
            </div>
            <div className="mt-8"><RatingLine /></div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="overflow-hidden rounded-[2.5rem]">
          <div className="h-[560px] bg-cover bg-center" style={{ backgroundImage: `url(${salon.interiorImage})` }} />
        </div>
        <div className="self-center">
          <Eyebrow>Welcome to Maison Elegance</Eyebrow>
          <h2 className="mt-4 font-serif text-5xl leading-tight">Quiet luxury, personal consultation, precise hair work.</h2>
          <p className="mt-6 text-lg leading-8 text-[#68584d]">Maison Elegance is a premium Brussels salon for clients who want beautiful hair without rushed appointments. Every visit begins with a thoughtful consultation, transparent pricing and a finish designed for your daily life.</p>
          <p className="mt-4 leading-7 text-[#68584d]">Our team works with professional products, warm hospitality and techniques tailored to your hair, lifestyle and language preference.</p>
        </div>
      </section>

      <section className="bg-[#fffaf4]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow>Popular services</Eyebrow>
              <h2 className="mt-4 font-serif text-5xl">Signature appointments</h2>
            </div>
            <Link href="/services" className="font-semibold text-[#6d4f35]">View all services</Link>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {services.slice(0, 8).map((service) => <ServiceCard key={service.id} service={service} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Eyebrow>Why choose us</Eyebrow>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Experienced Professionals", Award],
            ["Premium Hair Products", Gem],
            ["Personal Consultation", HeartHandshake],
            ["Relaxing Atmosphere", Leaf],
            ["Online Booking", CalendarCheck],
            ["Central Brussels Location", MapPin],
          ].map(([label, Icon]) => (
            <div key={label as string} className="rounded-[1.5rem] border border-[#34251c]/10 bg-[#fffaf4] p-6">
              <Icon className="text-[#9a7a58]" size={24} />
              <h3 className="mt-5 font-serif text-2xl">{label as string}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#2f2118] text-[#fffaf4]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow>Our team</Eyebrow>
              <h2 className="mt-4 font-serif text-5xl">Meet your stylists</h2>
            </div>
            <Link href="/team" className="rounded-full border border-white/25 px-5 py-3 font-semibold">Meet Our Team</Link>
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
            <Eyebrow>Salon experience</Eyebrow>
            <h2 className="mt-4 font-serif text-5xl">Inside Maison Elegance</h2>
          </div>
          <Link href="/gallery" className="font-semibold text-[#6d4f35]">View gallery</Link>
        </div>
        <div className="mt-10 grid auto-rows-[220px] gap-4 md:grid-cols-4">
          {gallery.slice(0, 6).map((item, index) => (
            <a key={item.id} href={`/gallery#${item.id}`} className={`rounded-[1.5rem] bg-cover bg-center ${index === 0 || index === 3 ? "md:col-span-2 md:row-span-2" : ""}`} style={{ backgroundImage: `url(${item.image})` }} aria-label={`Open ${item.title}`} />
          ))}
        </div>
      </section>

      <section className="bg-[#fffaf4]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <Eyebrow>Client reviews</Eyebrow>
          <h2 className="mt-4 font-serif text-5xl">What clients say</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {reviews.slice(0, 3).map((review) => (
              <article key={review.id} className="rounded-[1.5rem] border border-[#34251c]/10 bg-[#f8f3ec] p-6">
                <p className="text-[#b58b4a]">★★★★★</p>
                <p className="mt-4 leading-7 text-[#68584d]">{review.text}</p>
                <p className="mt-5 font-semibold">— {review.customer}</p>
              </article>
            ))}
          </div>
          <Link href="/reviews" className="mt-8 inline-flex rounded-full bg-[#2f2118] px-5 py-3 font-semibold text-white">Read All Reviews</Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-[2.5rem] bg-cover bg-center p-8 text-white sm:p-12" style={{ backgroundImage: `linear-gradient(90deg, rgba(47,33,24,.88), rgba(47,33,24,.35)), url(${salon.philosophyImage})` }}>
          <Eyebrow>Ready for your next look?</Eyebrow>
          <h2 className="mt-4 max-w-2xl font-serif text-5xl">Book a calm, personal appointment in Brussels.</h2>
          <Link href="/book" className="mt-8 inline-flex rounded-full bg-[#fffaf4] px-6 py-4 font-semibold text-[#2f2118]">Book Your Appointment</Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-24 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <Eyebrow>Location</Eyebrow>
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
