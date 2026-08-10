import Link from "next/link";
import { redirect } from "next/navigation";
import { Scissors } from "lucide-react";
import { canAccessAdmin, getInternalSession } from "@/lib/internal-auth";
import { validateInternalSession } from "@/lib/internal-db";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await validateInternalSession(await getInternalSession());
  if (session) redirect(canAccessAdmin(session) ? "/admin" : "/staff");
  const params = await searchParams;
  const showDemoCredentials = process.env.ENABLE_DEMO_SEED === "true";

  return (
    <main className="min-h-screen bg-[#f5f1eb] px-5 py-10 text-[#2d1c14]">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl items-center gap-8 md:grid-cols-[1fr_420px]">
        <div>
          <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold">
            <span className="grid h-11 w-11 place-items-center rounded-full border border-[#d8cbbd] bg-white">
              <Scissors size={18} />
            </span>
            Maison Elegance
          </Link>
          <p className="mt-12 text-xs font-bold uppercase tracking-[0.28em] text-[#9a7048]">Internal salon system</p>
          <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-tight">Operations, appointments and revenue in one secure workspace.</h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-[#684d3e]">
            Staff can manage their own workday. Managers and admins can review the complete salon performance from live booking data.
          </p>
        </div>

        <form action="/api/internal/login" method="post" className="rounded-[28px] border border-[#ded2c6] bg-white p-7 shadow-[0_18px_60px_rgba(45,28,20,0.12)]">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9a7048]">Sign in</p>
          <h2 className="mt-3 text-3xl font-semibold">Salon login</h2>
          {params.error ? <p className="mt-4 rounded-2xl bg-[#fff2ee] px-4 py-3 text-sm font-semibold text-[#9c3d28]">Email or password is incorrect.</p> : null}
          <label className="mt-6 block text-sm font-semibold">
            Email
            <input name="email" type="email" required className="mt-2 w-full rounded-2xl border border-[#ded2c6] px-4 py-3 outline-none focus:border-[#2d1c14]" placeholder="name@example.com" />
          </label>
          <label className="mt-4 block text-sm font-semibold">
            Password
            <input name="password" type="password" required className="mt-2 w-full rounded-2xl border border-[#ded2c6] px-4 py-3 outline-none focus:border-[#2d1c14]" placeholder="Enter your password" />
          </label>
          <button className="mt-6 w-full rounded-2xl bg-[#2d1c14] px-5 py-4 font-bold text-white shadow-lg shadow-[#2d1c14]/15">Login</button>
          {showDemoCredentials ? (
            <div className="mt-5 rounded-2xl bg-[#f7f3ed] p-4 text-sm leading-7 text-[#684d3e]">
              Staff demo: staff@maisonelegance.be / staff123<br />
              Admin demo: admin@maisonelegance.be / admin123
            </div>
          ) : null}
        </form>
      </section>
    </main>
  );
}
