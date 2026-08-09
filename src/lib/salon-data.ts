export type ServiceCategory = "Haircuts" | "Color" | "Styling" | "Treatments" | "Grooming";

export type Service = {
  id: string;
  category: ServiceCategory;
  name: string;
  description: string;
  duration: number;
  price: number;
  image: string;
  active: boolean;
};

export type Staff = {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  bio: string;
  photo: string;
  specialties: string[];
  experience: string;
  languages: string[];
  services: string[];
  email: string;
  phone: string;
  schedule: Record<string, string>;
  lunchBreaks?: Record<string, string>;
  timeOff?: { date: string; reason: string }[];
};

export type Review = {
  id: string;
  customer: string;
  rating: number;
  date: string;
  text: string;
  appointmentStatus: "completed";
  response?: string;
};

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

export type Appointment = {
  id: string;
  reference: string;
  customer: string;
  email: string;
  phone: string;
  serviceId: string;
  staffId: string;
  date: string;
  start: string;
  end: string;
  duration: number;
  price: number;
  status: AppointmentStatus;
  notes?: string;
  createdAt?: string;
};

export const salon = {
  name: "Maison Elegance",
  displayName: "Maison Elegance",
  city: "Brussels",
  country: "Belgium",
  address: "Avenue Louise 120, 1050 Brussels, Belgium",
  phone: "+32 2 468 18 55",
  email: "hello@maisonelegance.be",
  rating: 4.9,
  reviewCount: 185,
  instagram: "@maisonelegance.brussels",
  facebook: "Maison Elegance Brussels",
  heroImage:
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1800&q=85",
  interiorImage:
    "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1400&q=85",
  philosophyImage:
    "https://images.unsplash.com/photo-1559599101-f09722fb4948?auto=format&fit=crop&w=1400&q=85",
  hours: {
    Monday: "Closed",
    Tuesday: "09:00-18:00",
    Wednesday: "09:00-18:00",
    Thursday: "09:00-20:00",
    Friday: "09:00-19:00",
    Saturday: "09:00-18:00",
    Sunday: "Closed",
  },
};

export const services: Service[] = [
  { id: "women-cut", category: "Haircuts", name: "Women's Haircut", description: "A tailored cut with consultation, wash, finish and styling advice.", duration: 60, price: 55, image: "https://images.rawpixel.com/image_800/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvNDc0LW1rLTQ2NjNfMS5qcGc.jpg", active: true },
  { id: "men-cut", category: "Haircuts", name: "Men's Haircut", description: "Precision cutting, clean finish and styling for everyday shape.", duration: 40, price: 38, image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=900&q=80", active: true },
  { id: "kids-cut", category: "Haircuts", name: "Kids Haircut", description: "Gentle, practical haircut for children up to 12 years old.", duration: 30, price: 28, image: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=900&q=80", active: true },
  { id: "full-color", category: "Color", name: "Full Color", description: "Rich all-over colour with professional tone selection and gloss finish.", duration: 120, price: 95, image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=900&q=80", active: true },
  { id: "root-color", category: "Color", name: "Root Color", description: "Seamless root refresh matched to your existing colour.", duration: 90, price: 68, image: "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=900&q=80", active: true },
  { id: "highlights", category: "Color", name: "Highlights", description: "Soft, dimensional brightness placed to flatter your haircut and skin tone.", duration: 150, price: 115, image: "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?auto=format&fit=crop&w=900&q=80", active: true },
  { id: "balayage", category: "Color", name: "Balayage", description: "Natural, dimensional highlights customized to your hair and personal style.", duration: 150, price: 120, image: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=900&q=80", active: true },
  { id: "blow-dry", category: "Styling", name: "Blow Dry", description: "Polished blow dry with movement, volume and long-lasting finish.", duration: 40, price: 42, image: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=900&q=80", active: true },
  { id: "hair-styling", category: "Styling", name: "Hair Styling", description: "Elegant styling for dinner, events, photoshoots or a refined daily look.", duration: 55, price: 62, image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=80", active: true },
  { id: "wedding-styling", category: "Styling", name: "Wedding Styling", description: "Trial and event styling with notes saved for the wedding day.", duration: 90, price: 110, image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80", active: true },
  { id: "repair-treatment", category: "Treatments", name: "Hair Repair Treatment", description: "Deep repair ritual for dry, fragile or colour-treated hair.", duration: 45, price: 52, image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=80", active: true },
  { id: "keratin", category: "Treatments", name: "Keratin Treatment", description: "Smoothing treatment for controlled shine and easier styling.", duration: 120, price: 145, image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=900&q=80", active: true },
  { id: "scalp", category: "Treatments", name: "Scalp Treatment", description: "Clarifying scalp care with massage and personalised home-care advice.", duration: 45, price: 48, image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=80", active: true },
  { id: "beard-trim", category: "Grooming", name: "Beard Trim", description: "Clean shaping and finishing for a refined beard line.", duration: 25, price: 24, image: "https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=900&q=80", active: true },
];

export const staff: Staff[] = [
  {
    id: "sophie",
    firstName: "Sophie",
    lastName: "Laurent",
    title: "Senior Stylist & Color Specialist",
    bio: "Sophie leads colour consultations with a calm editorial eye, creating soft balayage, lived-in blondes and precise women's cuts.",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=700&q=85",
    specialties: ["Balayage", "Hair Coloring", "Women's Haircuts"],
    experience: "12 years experience",
    languages: ["French", "English"],
    services: ["women-cut", "full-color", "highlights", "balayage", "root-color"],
    email: "sophie@maisonelegance.be",
    phone: "+32 2 468 18 61",
    schedule: { Tuesday: "09:00-18:00", Wednesday: "09:00-18:00", Thursday: "11:00-20:00", Friday: "09:00-19:00", Saturday: "09:00-18:00" },
    lunchBreaks: { Tuesday: "12:30-13:15", Wednesday: "12:30-13:15", Thursday: "14:00-14:45", Friday: "13:00-13:45", Saturday: "12:30-13:00" },
    timeOff: [{ date: "2026-08-20", reason: "Vacation" }],
  },
  {
    id: "julien",
    firstName: "Julien",
    lastName: "Moreau",
    title: "Master Stylist",
    bio: "Julien is known for architectural cuts, polished blow dries and an intuitive understanding of everyday maintenance.",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=85",
    specialties: ["Precision Cuts", "Blow Dry", "Men's Haircuts"],
    experience: "10 years experience",
    languages: ["French", "Dutch", "English"],
    services: ["women-cut", "men-cut", "blow-dry", "hair-styling"],
    email: "julien@maisonelegance.be",
    phone: "+32 2 468 18 62",
    schedule: { Tuesday: "09:00-18:00", Wednesday: "09:00-18:00", Thursday: "09:00-18:00", Friday: "10:00-19:00", Saturday: "09:00-18:00" },
    lunchBreaks: { Tuesday: "13:00-13:45", Wednesday: "13:00-13:45", Thursday: "12:30-13:15", Friday: "14:00-14:45", Saturday: "12:00-12:45" },
    timeOff: [{ date: "2026-08-22", reason: "Training" }],
  },
  {
    id: "amina",
    firstName: "Amina",
    lastName: "Benali",
    title: "Treatment & Texture Specialist",
    bio: "Amina focuses on hair health, scalp care, curls and smoothing treatments with a practical home-care plan.",
    photo: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=700&q=85",
    specialties: ["Keratin", "Repair Treatments", "Textured Hair"],
    experience: "8 years experience",
    languages: ["French", "Dutch"],
    services: ["repair-treatment", "keratin", "scalp", "women-cut"],
    email: "amina@maisonelegance.be",
    phone: "+32 2 468 18 63",
    schedule: { Tuesday: "10:00-18:00", Wednesday: "09:00-17:00", Thursday: "11:00-20:00", Friday: "09:00-18:00", Saturday: "09:00-17:00" },
    lunchBreaks: { Tuesday: "13:30-14:15", Wednesday: "12:30-13:15", Thursday: "15:00-15:45", Friday: "13:00-13:45", Saturday: "12:30-13:00" },
    timeOff: [{ date: "2026-08-19", reason: "Day off" }],
  },
  {
    id: "lotte",
    firstName: "Lotte",
    lastName: "Van den Berg",
    title: "Stylist & Bridal Specialist",
    bio: "Lotte creates elegant styling for events and weddings, from soft waves to structured updos.",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=700&q=85",
    specialties: ["Wedding Styling", "Blow Dry", "Highlights"],
    experience: "7 years experience",
    languages: ["Dutch", "English", "French"],
    services: ["wedding-styling", "hair-styling", "blow-dry", "highlights", "kids-cut"],
    email: "lotte@maisonelegance.be",
    phone: "+32 2 468 18 64",
    schedule: { Wednesday: "09:00-18:00", Thursday: "11:00-20:00", Friday: "09:00-19:00", Saturday: "09:00-18:00" },
    lunchBreaks: { Wednesday: "13:00-13:45", Thursday: "14:30-15:15", Friday: "13:00-13:45", Saturday: "12:00-12:45" },
    timeOff: [{ date: "2026-08-21", reason: "Wedding booking offsite" }],
  },
];

export const reviews: Review[] = [
  { id: "r1", customer: "Emma D.", rating: 5, date: "2026-07-28", text: "Absolutely loved my balayage. Sophie really took the time to understand what I wanted.", appointmentStatus: "completed", response: "Thank you Emma, it was a pleasure." },
  { id: "r2", customer: "Clara V.", rating: 5, date: "2026-07-24", text: "The salon is peaceful and elegant. My colour looks natural and expensive.", appointmentStatus: "completed" },
  { id: "r3", customer: "Thomas B.", rating: 5, date: "2026-07-22", text: "Julien gave me the best haircut I have had in Brussels.", appointmentStatus: "completed" },
  { id: "r4", customer: "Nadia H.", rating: 5, date: "2026-07-18", text: "Amina transformed my dry hair. The repair treatment made a visible difference.", appointmentStatus: "completed" },
  { id: "r5", customer: "Sanne K.", rating: 4, date: "2026-07-15", text: "Beautiful atmosphere and very clear pricing. I will return.", appointmentStatus: "completed" },
  { id: "r6", customer: "Marie L.", rating: 5, date: "2026-07-12", text: "The consultation was thoughtful and never rushed.", appointmentStatus: "completed" },
  { id: "r7", customer: "Nicolas R.", rating: 5, date: "2026-07-09", text: "Easy online booking and the appointment started exactly on time.", appointmentStatus: "completed" },
  { id: "r8", customer: "Eva M.", rating: 5, date: "2026-07-05", text: "Lotte styled my hair for an event and it lasted all night.", appointmentStatus: "completed" },
  { id: "r9", customer: "Ines F.", rating: 5, date: "2026-07-01", text: "Professional products, excellent advice and a very polished result.", appointmentStatus: "completed" },
  { id: "r10", customer: "Arthur P.", rating: 4, date: "2026-06-27", text: "Warm welcome, great haircut, simple booking process.", appointmentStatus: "completed" },
  { id: "r11", customer: "Lea C.", rating: 5, date: "2026-06-22", text: "My highlights are soft and beautifully blended.", appointmentStatus: "completed" },
  { id: "r12", customer: "Maxime J.", rating: 5, date: "2026-06-18", text: "Premium without feeling intimidating. Very good service.", appointmentStatus: "completed" },
  { id: "r13", customer: "Charlotte N.", rating: 5, date: "2026-06-14", text: "I appreciated the aftercare notes and product recommendations.", appointmentStatus: "completed" },
  { id: "r14", customer: "Hanne W.", rating: 5, date: "2026-06-11", text: "The online booking flow is clear and the team is excellent.", appointmentStatus: "completed" },
  { id: "r15", customer: "Camille S.", rating: 5, date: "2026-06-08", text: "The best blow dry before a work event.", appointmentStatus: "completed" },
  { id: "r16", customer: "Lina A.", rating: 4, date: "2026-06-03", text: "Lovely interior, kind team and transparent service menu.", appointmentStatus: "completed" },
];

export const appointments: Appointment[] = [
  { id: "a1", reference: "ME-260812-1030", customer: "Emma D.", email: "emma.d@example.com", phone: "+32 472 18 55 11", serviceId: "women-cut", staffId: "sophie", date: "2026-08-12", start: "10:30", end: "11:30", duration: 60, price: 55, status: "confirmed", notes: "Prefers soft face-framing layers." },
  { id: "a2", reference: "ME-260812-1200", customer: "Thomas B.", email: "thomas.b@example.com", phone: "+32 486 12 44 88", serviceId: "men-cut", staffId: "julien", date: "2026-08-12", start: "12:00", end: "12:40", duration: 40, price: 38, status: "pending" },
  { id: "a3", reference: "ME-260812-1400", customer: "Nadia H.", email: "nadia.h@example.com", phone: "+32 471 77 83 21", serviceId: "keratin", staffId: "amina", date: "2026-08-12", start: "14:00", end: "16:00", duration: 120, price: 145, status: "confirmed" },
  { id: "a4", reference: "ME-260813-0900", customer: "Sanne K.", email: "sanne.k@example.com", phone: "+32 489 33 91 20", serviceId: "highlights", staffId: "lotte", date: "2026-08-13", start: "09:00", end: "11:30", duration: 150, price: 115, status: "confirmed" },
  { id: "a5", reference: "ME-260813-1530", customer: "Marie L.", email: "marie.l@example.com", phone: "+32 473 44 19 72", serviceId: "balayage", staffId: "sophie", date: "2026-08-13", start: "15:30", end: "18:00", duration: 150, price: 120, status: "pending" },
  { id: "a6", reference: "ME-260814-1100", customer: "Nicolas R.", email: "nicolas.r@example.com", phone: "+32 470 54 13 14", serviceId: "blow-dry", staffId: "julien", date: "2026-08-14", start: "11:00", end: "11:40", duration: 40, price: 42, status: "confirmed" },
  { id: "a7", reference: "ME-260814-1600", customer: "Eva M.", email: "eva.m@example.com", phone: "+32 485 17 00 29", serviceId: "hair-styling", staffId: "lotte", date: "2026-08-14", start: "16:00", end: "16:55", duration: 55, price: 62, status: "confirmed" },
  { id: "a8", reference: "ME-260815-0930", customer: "Ines F.", email: "ines.f@example.com", phone: "+32 476 18 90 32", serviceId: "root-color", staffId: "sophie", date: "2026-08-15", start: "09:30", end: "11:00", duration: 90, price: 68, status: "confirmed" },
  { id: "a9", reference: "ME-260815-1300", customer: "Arthur P.", email: "arthur.p@example.com", phone: "+32 488 22 49 75", serviceId: "beard-trim", staffId: "julien", date: "2026-08-15", start: "13:00", end: "13:25", duration: 25, price: 24, status: "pending" },
  { id: "a10", reference: "ME-260722-1000", customer: "Clara V.", email: "clara.v@example.com", phone: "+32 472 88 30 91", serviceId: "full-color", staffId: "sophie", date: "2026-07-22", start: "10:00", end: "12:00", duration: 120, price: 95, status: "completed" },
  { id: "a11", reference: "ME-260718-1430", customer: "Lea C.", email: "lea.c@example.com", phone: "+32 479 10 62 19", serviceId: "highlights", staffId: "lotte", date: "2026-07-18", start: "14:30", end: "17:00", duration: 150, price: 115, status: "completed" },
  { id: "a12", reference: "ME-260710-0900", customer: "Maxime J.", email: "maxime.j@example.com", phone: "+32 486 55 18 61", serviceId: "men-cut", staffId: "julien", date: "2026-07-10", start: "09:00", end: "09:40", duration: 40, price: 38, status: "completed" },
  { id: "a13", reference: "ME-260704-1130", customer: "Charlotte N.", email: "charlotte.n@example.com", phone: "+32 474 90 12 66", serviceId: "repair-treatment", staffId: "amina", date: "2026-07-04", start: "11:30", end: "12:15", duration: 45, price: 52, status: "completed" },
  { id: "a14", reference: "ME-260628-1600", customer: "Hanne W.", email: "hanne.w@example.com", phone: "+32 489 13 57 88", serviceId: "wedding-styling", staffId: "lotte", date: "2026-06-28", start: "16:00", end: "17:30", duration: 90, price: 110, status: "cancelled" },
  { id: "a15", reference: "ME-260620-1500", customer: "Camille S.", email: "camille.s@example.com", phone: "+32 471 33 20 77", serviceId: "blow-dry", staffId: "julien", date: "2026-06-20", start: "15:00", end: "15:40", duration: 40, price: 42, status: "no_show" },
  { id: "a16", reference: "ME-260616-1030", customer: "Lina A.", email: "lina.a@example.com", phone: "+32 486 72 64 11", serviceId: "scalp", staffId: "amina", date: "2026-06-16", start: "10:30", end: "11:15", duration: 45, price: 48, status: "completed" },
];

export const gallery = [
  { id: "g1", category: "Salon", title: "Louise avenue reception", image: salon.interiorImage },
  { id: "g2", category: "Salon", title: "Quiet styling suite", image: "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=1200&q=85" },
  { id: "g3", category: "Haircuts", title: "Soft layers", image: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=1200&q=85" },
  { id: "g4", category: "Coloring", title: "Gloss colour", image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1200&q=85" },
  { id: "g5", category: "Balayage", title: "Dimensional balayage", image: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=1200&q=85" },
  { id: "g6", category: "Styling", title: "Event styling", image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=85" },
  { id: "g7", category: "Products", title: "Professional care", image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=85" },
  { id: "g8", category: "Team", title: "Consultation ritual", image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=85" },
];

export const languages = [
  { code: "en", label: "English" },
  { code: "fr", label: "Francais" },
  { code: "nl", label: "Nederlands" },
];

export const publicNav = ["Services", "Team", "Gallery", "Reviews", "About Us", "Contact"];

export const serviceCategories: ServiceCategory[] = ["Haircuts", "Color", "Styling", "Treatments", "Grooming"];

export function serviceById(id: string) {
  return services.find((service) => service.id === id) ?? services[0];
}

export function staffById(id: string) {
  return staff.find((person) => person.id === id) ?? staff[0];
}
