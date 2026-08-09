import { PublicPage, Eyebrow } from "@/components/public-shell";
import { ServiceCard } from "@/components/service-card";
import { serviceCategories, services } from "@/lib/salon-data";

export default function ServicesPage() {
  return (
    <PublicPage>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Eyebrow>Services and prices</Eyebrow>
        <h1 className="mt-4 max-w-3xl font-serif text-6xl leading-tight">Professional hair care, clearly priced.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#68584d]">Choose a service category, compare duration and price, then book directly with Maison Elegance.</p>
      </section>
      <section className="mx-auto max-w-7xl space-y-16 px-4 pb-24 sm:px-6 lg:px-8">
        {serviceCategories.map((category) => (
          <div key={category}>
            <h2 className="font-serif text-4xl">{category}</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {services.filter((service) => service.category === category).map((service) => <ServiceCard key={service.id} service={service} />)}
            </div>
          </div>
        ))}
      </section>
    </PublicPage>
  );
}
