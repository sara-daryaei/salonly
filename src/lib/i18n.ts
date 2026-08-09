import type { Service } from "@/lib/salon-data";

export type Locale = "en" | "nl";

export const locales: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "nl", label: "Nederlands" },
];

type SearchParams = Record<string, string | string[] | undefined>;

export function normalizeLocale(value?: string | null): Locale {
  return value === "nl" ? "nl" : "en";
}

export function localeFromSearchParams(searchParams?: SearchParams | null): Locale {
  const raw = Array.isArray(searchParams?.lang) ? searchParams?.lang[0] : searchParams?.lang;
  return normalizeLocale(raw);
}

export function localizedHref(href: string, locale: Locale) {
  if (locale === "en") return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}lang=${locale}`;
}

export function switchLocaleHref(pathname: string, targetLocale: Locale) {
  return targetLocale === "en" ? pathname : localizedHref(pathname, targetLocale);
}

export const serviceCategoryLabels: Record<Locale, Record<string, string>> = {
  en: {
    Haircuts: "Haircuts",
    Color: "Color",
    Styling: "Styling",
    Treatments: "Treatments",
    Grooming: "Grooming",
  },
  nl: {
    Haircuts: "Knippen",
    Color: "Kleuren",
    Styling: "Styling",
    Treatments: "Verzorging",
    Grooming: "Grooming",
  },
};

export const serviceCopy: Record<string, Record<Locale, Pick<Service, "name" | "description">>> = {
  "women-cut": {
    en: { name: "Women's Haircut", description: "A tailored cut with consultation, wash, finish and styling advice." },
    nl: { name: "Damesknipbeurt", description: "Een snit op maat met advies, wassen, afwerking en stylingtips." },
  },
  "men-cut": {
    en: { name: "Men's Haircut", description: "Precision cutting, clean finish and styling for everyday shape." },
    nl: { name: "Herenknipbeurt", description: "Precies knipwerk, nette afwerking en styling voor elke dag." },
  },
  "kids-cut": {
    en: { name: "Kids Haircut", description: "Gentle, practical haircut for children up to 12 years old." },
    nl: { name: "Kinderknipbeurt", description: "Een rustige, praktische knipbeurt voor kinderen tot 12 jaar." },
  },
  "full-color": {
    en: { name: "Full Color", description: "Rich all-over colour with professional tone selection and gloss finish." },
    nl: { name: "Volledige Kleuring", description: "Een rijke volledige kleuring met professionele kleurkeuze en glansfinish." },
  },
  "root-color": {
    en: { name: "Root Color", description: "Seamless root refresh matched to your existing colour." },
    nl: { name: "Uitgroei Kleuren", description: "Een naadloze uitgroeibehandeling afgestemd op je huidige kleur." },
  },
  highlights: {
    en: { name: "Highlights", description: "Soft, dimensional brightness placed to flatter your haircut and skin tone." },
    nl: { name: "Highlights", description: "Zachte, dimensionale oplichting die past bij je snit en huidtint." },
  },
  balayage: {
    en: { name: "Balayage", description: "Natural, dimensional highlights customized to your hair and personal style." },
    nl: { name: "Balayage", description: "Natuurlijke, dimensionale highlights afgestemd op je haar en stijl." },
  },
  "blow-dry": {
    en: { name: "Blow Dry", description: "Polished blow dry with movement, volume and long-lasting finish." },
    nl: { name: "Brushen", description: "Verzorgde brushing met beweging, volume en een langdurige finish." },
  },
  "hair-styling": {
    en: { name: "Hair Styling", description: "Elegant styling for dinner, events, photoshoots or a refined daily look." },
    nl: { name: "Haarstyling", description: "Elegante styling voor diner, events, fotoshoots of een verzorgde dagelijkse look." },
  },
  "wedding-styling": {
    en: { name: "Wedding Styling", description: "Trial and event styling with notes saved for the wedding day." },
    nl: { name: "Bruidsstyling", description: "Proefsessie en styling met notities voor de trouwdag." },
  },
  "repair-treatment": {
    en: { name: "Hair Repair Treatment", description: "Deep repair ritual for dry, fragile or colour-treated hair." },
    nl: { name: "Herstellende Haarbehandeling", description: "Diep herstellend ritueel voor droog, kwetsbaar of gekleurd haar." },
  },
  keratin: {
    en: { name: "Keratin Treatment", description: "Smoothing treatment for controlled shine and easier styling." },
    nl: { name: "Keratinebehandeling", description: "Gladmakende behandeling voor gecontroleerde glans en makkelijker stylen." },
  },
  scalp: {
    en: { name: "Scalp Treatment", description: "Clarifying scalp care with massage and personalised home-care advice." },
    nl: { name: "Hoofdhuidbehandeling", description: "Zuiverende hoofdhuidverzorging met massage en persoonlijk thuisadvies." },
  },
  "beard-trim": {
    en: { name: "Beard Trim", description: "Clean shaping and finishing for a refined beard line." },
    nl: { name: "Baardtrim", description: "Strakke vormgeving en afwerking voor een verzorgde baardlijn." },
  },
};

export function serviceText(service: Service, locale: Locale) {
  return serviceCopy[service.id]?.[locale] ?? { name: service.name, description: service.description };
}

export const ui = {
  en: {
    nav: { home: "Home", services: "Services", team: "Team", gallery: "Gallery", reviews: "Reviews", about: "About Us", contact: "Contact", login: "Login", book: "Book Appointment" },
    footer: { navigation: "Navigation", hours: "Hours", contact: "Contact", legal: "Legal", reviewLine: "Based on 185 client reviews" },
    home: {
      eyebrow: "Premium hair salon in Brussels",
      title: "Beautiful Hair. Personal Experience.",
      subtitle: "Professional hair care and styling in the heart of Brussels.",
      discover: "Discover Our Services",
      welcomeEyebrow: "Welcome to Maison Elegance",
      welcomeTitle: "Quiet luxury, personal consultation, precise hair work.",
      welcomeBody: "Maison Elegance is a premium Brussels salon for clients who want beautiful hair without rushed appointments. Every visit begins with a thoughtful consultation, transparent pricing and a finish designed for your daily life.",
      welcomeBody2: "Our team works with professional products, warm hospitality and techniques tailored to your hair, lifestyle and language preference.",
      popular: "Popular services",
      signature: "Signature appointments",
      viewAll: "View all services",
      why: "Why choose us",
      team: "Our team",
      teamTitle: "Meet your stylists",
      teamCta: "Meet Our Team",
      experience: "Salon experience",
      inside: "Inside Maison Elegance",
      gallery: "View gallery",
      clientReviews: "Client reviews",
      reviewsTitle: "What clients say",
      reviewsCta: "Read All Reviews",
      ready: "Ready for your next look?",
      readyTitle: "Book a calm, personal appointment in Brussels.",
      location: "Location",
    },
    servicesPage: {
      eyebrow: "Services and prices",
      title: "Professional hair care, clearly priced.",
      body: "Choose a service category, compare duration and price, then book directly with Maison Elegance.",
    },
    bookPage: {
      eyebrow: "Book appointment",
      title: "Reserve your visit directly with Maison Elegance.",
      loading: "Loading booking flow...",
    },
    booking: {
      service: "Choose Service",
      professional: "Choose Professional",
      date: "Choose Date",
      time: "Choose Time",
      customer: "Customer Information",
      firstService: "Choose a service first.",
      firstServiceCalendar: "Choose a service first to open the appointment calendar.",
      noPreference: "No preference",
      anyStylist: "Any available stylist",
      previousMonth: "Previous month",
      nextMonth: "Next month",
      checking: "Checking availability...",
      dateHint: "Available days are clickable. Mondays, Sundays, past dates and fully booked days are disabled.",
      dateFirst: "Choose a date to see available times.",
      noTimes: "No appointments are available on this date.",
      anotherDate: "Choose another date",
      slotHint: "Slots are calculated from opening hours, working hours, breaks, days off, existing appointments and service duration to prevent double bookings.",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email",
      phone: "Phone",
      summary: "Booking summary",
      duration: "Duration",
      price: "Price",
      confirm: "Confirm Appointment",
      confirming: "Confirming...",
      requiredFirstName: "First name is required.",
      requiredLastName: "Last name is required.",
      invalidEmail: "Enter a valid email.",
      invalidPhone: "Enter a valid phone number.",
      bookingError: "Could not complete booking.",
    },
  },
  nl: {
    nav: { home: "Home", services: "Diensten", team: "Team", gallery: "Galerij", reviews: "Reviews", about: "Over ons", contact: "Contact", login: "Inloggen", book: "Afspraak boeken" },
    footer: { navigation: "Navigatie", hours: "Openingsuren", contact: "Contact", legal: "Juridisch", reviewLine: "Gebaseerd op 185 klantreviews" },
    home: {
      eyebrow: "Premium kapsalon in Brussel",
      title: "Mooi Haar. Persoonlijke Ervaring.",
      subtitle: "Professionele haarverzorging en styling in het hart van Brussel.",
      discover: "Ontdek Onze Diensten",
      welcomeEyebrow: "Welkom bij Maison Elegance",
      welcomeTitle: "Rustige luxe, persoonlijk advies en precies haarwerk.",
      welcomeBody: "Maison Elegance is een premium kapsalon in Brussel voor klanten die mooi haar willen zonder gehaaste afspraken. Elk bezoek begint met aandachtig advies, transparante prijzen en een afwerking die past bij je dagelijkse leven.",
      welcomeBody2: "Ons team werkt met professionele producten, warme gastvrijheid en technieken afgestemd op je haar, levensstijl en taalvoorkeur.",
      popular: "Populaire diensten",
      signature: "Signature afspraken",
      viewAll: "Bekijk alle diensten",
      why: "Waarom kiezen voor ons",
      team: "Ons team",
      teamTitle: "Ontmoet je stylisten",
      teamCta: "Ontmoet Ons Team",
      experience: "Salonervaring",
      inside: "Binnen Maison Elegance",
      gallery: "Bekijk galerij",
      clientReviews: "Klantreviews",
      reviewsTitle: "Wat klanten zeggen",
      reviewsCta: "Lees Alle Reviews",
      ready: "Klaar voor je volgende look?",
      readyTitle: "Boek een rustige, persoonlijke afspraak in Brussel.",
      location: "Locatie",
    },
    servicesPage: {
      eyebrow: "Diensten en prijzen",
      title: "Professionele haarverzorging, duidelijk geprijsd.",
      body: "Kies een categorie, vergelijk duur en prijs, en boek rechtstreeks bij Maison Elegance.",
    },
    bookPage: {
      eyebrow: "Afspraak boeken",
      title: "Reserveer je bezoek rechtstreeks bij Maison Elegance.",
      loading: "Boekingsflow laden...",
    },
    booking: {
      service: "Kies Dienst",
      professional: "Kies Professional",
      date: "Kies Datum",
      time: "Kies Tijd",
      customer: "Klantgegevens",
      firstService: "Kies eerst een dienst.",
      firstServiceCalendar: "Kies eerst een dienst om de kalender te openen.",
      noPreference: "Geen voorkeur",
      anyStylist: "Elke beschikbare stylist",
      previousMonth: "Vorige maand",
      nextMonth: "Volgende maand",
      checking: "Beschikbaarheid controleren...",
      dateHint: "Beschikbare dagen zijn klikbaar. Maandagen, zondagen, voorbije datums en volgeboekte dagen zijn uitgeschakeld.",
      dateFirst: "Kies een datum om beschikbare tijden te zien.",
      noTimes: "Geen afspraken beschikbaar op deze datum.",
      anotherDate: "Kies een andere datum",
      slotHint: "Tijden worden berekend op basis van openingsuren, werkuren, pauzes, vrije dagen, bestaande afspraken en duur van de dienst om dubbele boekingen te voorkomen.",
      firstName: "Voornaam",
      lastName: "Achternaam",
      email: "E-mail",
      phone: "Telefoon",
      summary: "Boekingsoverzicht",
      duration: "Duur",
      price: "Prijs",
      confirm: "Afspraak Bevestigen",
      confirming: "Bevestigen...",
      requiredFirstName: "Voornaam is verplicht.",
      requiredLastName: "Achternaam is verplicht.",
      invalidEmail: "Vul een geldig e-mailadres in.",
      invalidPhone: "Vul een geldig telefoonnummer in.",
      bookingError: "Boeking kon niet worden voltooid.",
    },
  },
} as const;
