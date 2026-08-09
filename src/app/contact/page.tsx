import { Mail, Phone } from "lucide-react";
import { Eyebrow, MapBlock, PublicPage } from "@/components/public-shell";
import { localeFromSearchParams } from "@/lib/i18n";
import { salon } from "@/lib/salon-data";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ContactPage({ searchParams }: PageProps) {
  const locale = localeFromSearchParams(await searchParams);
  const nl = locale === "nl";

  return (
    <PublicPage locale={locale}>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Eyebrow>Contact</Eyebrow>
        <h1 className="mt-4 font-serif text-6xl">{nl ? "Bezoek ons op Avenue Louise." : "Visit us on Avenue Louise."}</h1>
      </section>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-24 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-[#34251c]/10 bg-[#fffaf4] p-7">
            <h2 className="font-serif text-3xl">{salon.displayName}</h2>
            <p className="mt-4 text-[#68584d]">{salon.address}</p>
            <p className="mt-4 flex items-center gap-2 text-[#68584d]"><Phone size={17} /> {salon.phone}</p>
            <p className="mt-2 flex items-center gap-2 text-[#68584d]"><Mail size={17} /> {salon.email}</p>
            <div className="mt-6 space-y-2 text-sm text-[#68584d]">{Object.entries(salon.hours).map(([day, time]) => <div key={day} className="flex justify-between"><span>{day}</span><strong>{time}</strong></div>)}</div>
          </div>
          <MapBlock />
        </div>
        <form className="rounded-[2rem] border border-[#34251c]/10 bg-[#fffaf4] p-7">
          <h2 className="font-serif text-3xl">{nl ? "Stuur Bericht" : "Send Message"}</h2>
          <div className="mt-6 grid gap-4">
            {(nl ? ["Naam", "E-mail", "Telefoon"] : ["Name", "Email", "Phone"]).map((field) => <input key={field} className="rounded-2xl border border-[#34251c]/10 bg-white px-4 py-3 outline-none focus:border-[#9a7a58]" placeholder={field} />)}
            <textarea className="min-h-40 rounded-2xl border border-[#34251c]/10 bg-white px-4 py-3 outline-none focus:border-[#9a7a58]" placeholder={nl ? "Bericht" : "Message"} />
            <button className="rounded-full bg-[#2f2118] px-5 py-4 font-semibold text-white">{nl ? "Bericht Verzenden" : "Send Message"}</button>
          </div>
          <p className="mt-5 text-sm text-[#68584d]">Instagram: {salon.instagram} · Facebook: {salon.facebook}</p>
        </form>
      </section>
    </PublicPage>
  );
}
