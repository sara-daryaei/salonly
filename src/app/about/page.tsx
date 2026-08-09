import { Eyebrow, PublicPage } from "@/components/public-shell";
import { salon } from "@/lib/salon-data";

export default function AboutPage() {
  return (
    <PublicPage>
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
        <div>
          <Eyebrow>About us</Eyebrow>
          <h1 className="mt-4 font-serif text-6xl leading-tight">A Brussels salon shaped around consultation and calm.</h1>
          <p className="mt-6 text-lg leading-8 text-[#68584d]">Maison Elegance was created for clients who want high-quality colour, cutting and styling in a peaceful environment. We believe the best salon experience is personal, transparent and beautifully paced.</p>
        </div>
        <div className="min-h-[520px] rounded-[2.5rem] bg-cover bg-center" style={{ backgroundImage: `url(${salon.philosophyImage})` }} />
      </section>
      <section className="bg-[#fffaf4]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-20 sm:px-6 md:grid-cols-2 lg:px-8">
          {[
            ["Salon philosophy", "We begin with listening: your hair history, routine, preferences and the feeling you want after the appointment."],
            ["Experience", "Our team combines colour specialists, precision stylists and treatment experts with years of Brussels salon experience."],
            ["Professional products", "We use premium professional care selected for shine, durability and scalp comfort."],
            ["Customer approach", "Appointments are planned to avoid rushed service, unclear pricing or surprises at checkout."],
            ["Salon atmosphere", "Warm neutral interiors, soft light and quiet service create a refined city escape."],
            ["Easy to update", "The salon name, branding, address, services and hours are structured for future admin editing."],
          ].map(([title, copy]) => (
            <article key={title} className="rounded-[1.5rem] border border-[#34251c]/10 bg-[#f8f3ec] p-7">
              <h2 className="font-serif text-3xl">{title}</h2>
              <p className="mt-4 leading-7 text-[#68584d]">{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </PublicPage>
  );
}
