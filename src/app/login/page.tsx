import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MapPin, Scissors } from "lucide-react";
import { InternalLoginForm } from "@/components/internal-login-form";
import { canAccessAdmin, getInternalSession } from "@/lib/internal-auth";
import { validateInternalSession } from "@/lib/internal-db";

export const metadata: Metadata = {
  title: "Maison Elegance | Staff & Management Portal",
  description: "Private salon workspace for Maison Elegance staff, managers and administrators.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await validateInternalSession(await getInternalSession());
  if (session) redirect(canAccessAdmin(session) ? "/admin" : "/staff");
  const params = await searchParams;
  const showDemoCredentials = process.env.ENABLE_DEMO_SEED === "true";
  const demoAccounts = showDemoCredentials
    ? [
      { label: "Employee demo", email: "staff@maisonelegance.be", password: "staff123" },
      { label: "Manager demo", email: "admin@maisonelegance.be", password: "admin123" },
    ]
    : undefined;

  return (
    <main className="min-h-screen bg-[#f5f1eb] text-[#2d1c14]">
      <section className="grid min-h-screen lg:grid-cols-[minmax(0,58fr)_minmax(420px,42fr)]">
        <aside className="relative hidden min-h-screen overflow-hidden bg-[#2d1c14] text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_26%_18%,rgba(202,160,109,0.28),transparent_28%),linear-gradient(135deg,rgba(45,28,20,0.82),rgba(45,28,20,0.96))]" />
          <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)]" />
          <div className="absolute -right-24 top-20 h-80 w-80 rounded-full border border-white/10" />
          <div className="absolute bottom-24 left-16 h-60 w-60 rounded-full border border-[#c8a06d]/25" />
          <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:72px_72px]" />

          <div className="relative z-10 flex min-h-screen flex-col justify-between px-12 py-10 xl:px-16">
            <Link href="/" className="inline-flex w-fit items-center gap-3 rounded-xl text-sm font-semibold outline-none transition hover:text-[#f2d6ae] focus-visible:ring-4 focus-visible:ring-[#c8a06d]/35">
              <span className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-white/10">
                <Scissors size={18} aria-hidden="true" />
              </span>
              Maison Elegance
            </Link>

            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d6b17e]">Staff & Management Portal</p>
              <h2 className="mt-5 text-6xl font-semibold leading-tight tracking-normal">Maison Elegance</h2>
              <p className="mt-6 max-w-md text-lg leading-8 text-[#f4e9db]">
                Manage appointments, clients and salon operations securely.
              </p>
            </div>

            <p className="flex items-center gap-2 text-sm font-semibold text-[#f4e9db]/85">
              <MapPin size={16} aria-hidden="true" />
              Brussels, Belgium
            </p>
          </div>
        </aside>

        <div className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:bg-white">
          <div className="w-full max-w-[420px]">
            <div className="mb-8 flex items-center justify-between gap-4 lg:hidden">
              <Link href="/" className="inline-flex items-center gap-3 rounded-xl text-sm font-semibold outline-none transition hover:text-[#7f5835] focus-visible:ring-4 focus-visible:ring-[#c8a06d]/25">
                <span className="grid h-11 w-11 place-items-center rounded-full border border-[#d8cbbd] bg-white">
                  <Scissors size={18} aria-hidden="true" />
                </span>
                <span>
                  <span className="block">Maison Elegance</span>
                  <span className="block text-xs font-medium text-[#7a6254]">Staff & Management Portal</span>
                </span>
              </Link>
            </div>

            <Link href="/" className="mb-10 hidden w-fit items-center gap-2 rounded-xl text-sm font-semibold text-[#7a6254] outline-none transition hover:text-[#2d1c14] focus-visible:ring-4 focus-visible:ring-[#c8a06d]/25 lg:inline-flex">
              <ArrowLeft size={16} aria-hidden="true" />
              Back to salon website
            </Link>

            <div className="rounded-[28px] border border-[#ded2c6] bg-white p-6 shadow-[0_18px_50px_rgba(45,28,20,0.10)] sm:p-8 lg:border-0 lg:p-0 lg:shadow-none">
              <InternalLoginForm hasError={Boolean(params.error)} demoAccounts={demoAccounts} />
            </div>

            <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl text-sm font-semibold text-[#7a6254] outline-none transition hover:text-[#2d1c14] focus-visible:ring-4 focus-visible:ring-[#c8a06d]/25 lg:hidden">
              <ArrowLeft size={16} aria-hidden="true" />
              Back to salon website
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
