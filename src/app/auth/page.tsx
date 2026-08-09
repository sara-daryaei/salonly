import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Eyebrow, PublicPage } from "@/components/public-shell";

export default function AuthPage() {
  return (
    <PublicPage>
      <section className="grid min-h-screen place-items-center px-4 py-16">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[#34251c]/10 bg-[#fffaf4] shadow-2xl shadow-[#2f2118]/10 lg:grid-cols-[1fr_0.9fr]">
          <div className="bg-[#2f2118] p-8 text-white sm:p-12">
            <Eyebrow>Role-aware access</Eyebrow>
            <h1 className="mt-4 font-serif text-5xl leading-tight">Sign in to Maison Elegance.</h1>
            <p className="mt-5 leading-7 text-white/75">
              This demo is ready for Supabase Auth with customer, staff and admin roles. Customers manage bookings, staff access allowed scheduling tools, and admins manage the full salon system.
            </p>
            <div className="mt-8 space-y-3 text-sm text-white/80">
              {["Customer appointment area", "Staff calendar access", "Admin salon management"].map((item) => (
                <p key={item} className="flex items-center gap-3"><ShieldCheck size={17} /> {item}</p>
              ))}
            </div>
          </div>
          <div className="p-8 sm:p-12">
            <h2 className="font-serif text-3xl">Welcome back</h2>
            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold">Email</span>
                <input className="mt-2 w-full rounded-2xl border border-[#34251c]/10 px-4 py-3 outline-none focus:border-[#9a7a58]" placeholder="you@example.com" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Password</span>
                <input type="password" className="mt-2 w-full rounded-2xl border border-[#34251c]/10 px-4 py-3 outline-none focus:border-[#9a7a58]" placeholder="Password" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Demo role</span>
                <select className="mt-2 w-full rounded-2xl border border-[#34251c]/10 px-4 py-3 outline-none focus:border-[#9a7a58]">
                  <option>Customer</option>
                  <option>Staff</option>
                  <option>Admin</option>
                </select>
              </label>
              <Link href="/account" className="block rounded-full bg-[#2f2118] px-5 py-4 text-center font-semibold text-white">Continue to Account</Link>
              <p className="text-center text-sm text-[#68584d]">Salon staff? <Link href="/admin" className="font-semibold text-[#2f2118]">Open private admin</Link></p>
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
