import { Eyebrow, PublicPage, RatingLine } from "@/components/public-shell";
import { reviews } from "@/lib/salon-data";

export default function ReviewsPage() {
  return (
    <PublicPage>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Eyebrow>Customer reviews</Eyebrow>
        <h1 className="mt-4 font-serif text-6xl">4.9 / 5</h1>
        <div className="mt-5"><RatingLine /></div>
        <div className="mt-8 flex gap-3">
          {["Most Recent", "Highest Rating"].map((filter) => <button key={filter} className="rounded-full border border-[#34251c]/10 bg-[#fffaf4] px-4 py-2 text-sm font-semibold text-[#68584d]">{filter}</button>)}
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-16 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
        {reviews.map((review) => (
          <article key={review.id} className="rounded-[1.5rem] border border-[#34251c]/10 bg-[#fffaf4] p-6">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{review.customer}</p>
              <p className="text-sm text-[#9a7a58]">{review.date}</p>
            </div>
            <p className="mt-3 text-[#b58b4a]">★★★★★</p>
            <p className="mt-4 leading-7 text-[#68584d]">{review.text}</p>
            {review.response ? <p className="mt-4 rounded-2xl bg-[#f1e8db] p-4 text-sm text-[#6d4f35]">Salon response: {review.response}</p> : null}
          </article>
        ))}
      </section>
      <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-[#34251c]/10 bg-[#fffaf4] p-8">
          <Eyebrow>Completed appointments only</Eyebrow>
          <h2 className="mt-4 font-serif text-4xl">Leave a review</h2>
          <p className="mt-3 text-sm leading-6 text-[#68584d]">In production, this form is available only after a completed appointment.</p>
          <div className="mt-6 grid gap-4">
            <select className="rounded-2xl border border-[#34251c]/10 bg-white px-4 py-3"><option>5 stars</option><option>4 stars</option><option>3 stars</option></select>
            <textarea className="min-h-32 rounded-2xl border border-[#34251c]/10 bg-white px-4 py-3" placeholder="Share your experience" />
            <button className="rounded-full bg-[#2f2118] px-5 py-3 font-semibold text-white">Submit Review</button>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
