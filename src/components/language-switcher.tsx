"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { locales, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(target: Locale) {
    const params = new URLSearchParams(searchParams.toString());
    if (target === "en") {
      params.delete("lang");
    } else {
      params.set("lang", target);
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <div className="hidden rounded-full border border-[#34251c]/15 p-1 text-sm text-[#68584d] sm:flex" aria-label="Language selector">
      {locales.map((item) => (
        <Link
          key={item.code}
          href={hrefFor(item.code)}
          className={`rounded-full px-3 py-1.5 ${locale === item.code ? "bg-[#2f2118] text-white" : ""}`}
        >
          {item.code.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
