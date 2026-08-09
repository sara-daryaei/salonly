import Link from "next/link";
import { Clock } from "lucide-react";
import type { Service } from "@/lib/salon-data";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="group overflow-hidden rounded-[1.5rem] border border-[#34251c]/10 bg-[#fffaf4] shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#2f2118]/10">
      <div className="h-48 bg-cover bg-center transition duration-500 group-hover:scale-[1.03]" style={{ backgroundImage: `url(${service.image})` }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-serif text-2xl text-[#2e211a]">{service.name}</h3>
          <span className="rounded-full bg-[#eadfce] px-3 py-1 text-sm font-semibold text-[#6d4f35]">€{service.price}</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#68584d]">{service.description}</p>
        <div className="mt-5 flex items-center justify-between border-t border-[#34251c]/10 pt-4">
          <span className="flex items-center gap-2 text-sm text-[#68584d]"><Clock size={16} /> {service.duration} min</span>
          <Link href={`/book?service=${service.id}`} className="rounded-full bg-[#2f2118] px-4 py-2 text-sm font-semibold text-white">Book Now</Link>
        </div>
      </div>
    </article>
  );
}
