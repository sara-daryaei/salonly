import { Eyebrow, PublicPage } from "@/components/public-shell";
import { gallery } from "@/lib/salon-data";

export default function GalleryPage() {
  const categories = ["Salon", "Haircuts", "Coloring", "Balayage", "Styling"];
  return (
    <PublicPage>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Eyebrow>Gallery</Eyebrow>
        <h1 className="mt-4 font-serif text-6xl">A look inside Maison Elegance.</h1>
        <div className="mt-8 flex flex-wrap gap-3">
          {categories.map((category) => <span key={category} className="rounded-full border border-[#34251c]/10 bg-[#fffaf4] px-4 py-2 text-sm text-[#68584d]">{category}</span>)}
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl auto-rows-[260px] gap-4 px-4 pb-24 sm:px-6 md:grid-cols-3 lg:px-8">
        {gallery.map((item, index) => (
          <a id={item.id} key={item.id} href={`#lightbox-${item.id}`} className={`group relative overflow-hidden rounded-[1.5rem] bg-cover bg-center ${index % 5 === 0 ? "md:col-span-2 md:row-span-2" : ""}`} style={{ backgroundImage: `url(${item.image})` }}>
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 text-white">{item.title}</span>
          </a>
        ))}
      </section>
      {gallery.map((item) => (
        <div id={`lightbox-${item.id}`} key={`lightbox-${item.id}`} className="pointer-events-none fixed inset-0 z-[70] grid place-items-center bg-black/0 opacity-0 transition target:pointer-events-auto target:bg-black/85 target:opacity-100">
          <a href="/gallery" className="absolute inset-0" aria-label="Close lightbox" />
          <div className="relative h-[86vh] w-[90vw] rounded-2xl bg-contain bg-center bg-no-repeat shadow-2xl" style={{ backgroundImage: `url(${item.image})` }} role="img" aria-label={item.title} />
        </div>
      ))}
    </PublicPage>
  );
}
