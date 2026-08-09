import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, Camera, Scissors } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { localizedHref, type Locale, ui } from "@/lib/i18n";
import { salon } from "@/lib/salon-data";

const navItems = [
  ["services", "/services"],
  ["team", "/team"],
  ["gallery", "/gallery"],
  ["reviews", "/reviews"],
  ["about", "/about"],
  ["contact", "/contact"],
] as const;

export function PublicHeader({ locale = "en" }: { locale?: Locale }) {
  const copy = ui[locale];

  return (
    <header className="sticky top-0 z-50 border-b border-[#34251c]/10 bg-[#f8f3ec]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href={localizedHref("/", locale)} className="flex items-center gap-3" aria-label={`${salon.displayName} home`}>
          <span className="grid h-10 w-10 place-items-center rounded-full border border-[#34251c]/20 bg-[#fffaf4] text-[#6d4f35]">
            <Scissors size={18} />
          </span>
          <span className="font-serif text-xl tracking-wide text-[#2e211a]">{salon.displayName}</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-[#68584d] lg:flex">
          <Link href={localizedHref("/", locale)}>{copy.nav.home}</Link>
          {navItems.map(([key, href]) => (
            <Link key={key} href={localizedHref(href, locale)}>{copy.nav[key]}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Suspense fallback={<span className="hidden h-9 w-[94px] rounded-full border border-[#34251c]/15 sm:block" />}>
            <LanguageSwitcher locale={locale} />
          </Suspense>
          <Link href={localizedHref("/book", locale)} className="rounded-full bg-[#2f2118] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#2f2118]/15">
            {copy.nav.book}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter({ locale = "en" }: { locale?: Locale }) {
  const copy = ui[locale];

  return (
    <footer className="bg-[#2f2118] text-[#fff9f0]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_2fr] lg:px-8">
        <div>
          <h2 className="font-serif text-3xl">{salon.displayName}</h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[#fff9f0]/70">{salon.address}</p>
          <p className="mt-3 text-sm text-[#fff9f0]/70">{salon.phone}<br />{salon.email}</p>
          <div className="mt-5 flex gap-3 text-sm text-[#fff9f0]/75">
            <span className="flex items-center gap-2"><Camera size={16} /> Instagram</span>
            <span>Facebook</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <FooterGroup title={copy.footer.navigation} items={[copy.nav.home, copy.nav.services, copy.nav.team, copy.nav.gallery, copy.nav.reviews, copy.nav.book]} />
          <FooterGroup title={copy.footer.hours} items={Object.entries(salon.hours).slice(0, 5).map(([day, time]) => `${day}: ${time}`)} />
          <FooterGroup title={copy.footer.contact} items={[salon.phone, salon.email, "Avenue Louise 120"]} />
          <FooterGroup title={copy.footer.legal} items={["Privacy Policy", "Terms & Conditions", "Cookie Policy"]} />
        </div>
      </div>
      <Link href={localizedHref("/book", locale)} className="fixed inset-x-4 bottom-4 z-40 rounded-full bg-[#2f2118] py-4 text-center text-sm font-semibold text-white shadow-2xl shadow-black/30 md:hidden">
        {copy.nav.book}
      </Link>
    </footer>
  );
}

function FooterGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm text-[#fff9f0]/65">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

export function PublicPage({ children, locale = "en" }: { children: React.ReactNode; locale?: Locale }) {
  return (
    <>
      <PublicHeader locale={locale} />
      <main className="bg-[#f8f3ec] text-[#2e211a]">{children}</main>
      <PublicFooter locale={locale} />
    </>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9a7a58]">{children}</p>;
}

export function RatingLine({ locale = "en" }: { locale?: Locale }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-[#34251c]/15 bg-[#fffaf4]/85 px-4 py-2 text-sm text-[#68584d]">
      <span className="font-semibold text-[#2e211a]">{salon.rating} ★</span>
      <span>{ui[locale].footer.reviewLine}</span>
    </div>
  );
}

export function MapBlock() {
  return (
    <div className="relative min-h-72 overflow-hidden rounded-[2rem] border border-[#34251c]/10 bg-[#ded1c1]">
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(90deg, #b9a48f 1px, transparent 1px), linear-gradient(#b9a48f 1px, transparent 1px)", backgroundSize: "34px 34px" }} />
      <div className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#2f2118] text-white shadow-2xl">
        <CalendarDays />
      </div>
      <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-[#fffaf4]/90 p-4 text-sm text-[#68584d] backdrop-blur">
        <strong className="block text-[#2e211a]">{salon.displayName}</strong>
        {salon.address}
      </div>
    </div>
  );
}
