import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, Scissors } from "lucide-react";

export const metadata: Metadata = {
  title: "Password reset | Maison Elegance Portal",
  description: "Password reset guidance for the private Maison Elegance staff and management workspace.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f1eb] px-5 py-10 text-[#2d1c14]">
      <section className="w-full max-w-md rounded-[28px] border border-[#ded2c6] bg-white p-7 shadow-[0_18px_50px_rgba(45,28,20,0.10)]">
        <Link href="/" className="inline-flex items-center gap-3 rounded-xl text-sm font-semibold outline-none transition hover:text-[#7f5835] focus-visible:ring-4 focus-visible:ring-[#c8a06d]/25">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-[#d8cbbd] bg-[#fbf8f3]">
            <Scissors size={17} aria-hidden="true" />
          </span>
          Maison Elegance
        </Link>
        <div className="mt-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d9cabb] bg-[#fbf8f3] text-[#3a251a]">
          <LockKeyhole size={20} aria-hidden="true" />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-[#9a7048]">Account access</p>
        <h1 className="mt-3 text-3xl font-semibold">Reset your password</h1>
        <p className="mt-4 leading-7 text-[#6d584b]">Please contact your salon administrator to reset your account password.</p>
        <Link href="/login" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#2d1c14] px-5 py-3 font-bold text-white outline-none transition hover:bg-[#3a251a] focus-visible:ring-4 focus-visible:ring-[#c8a06d]/35">
          <ArrowLeft size={17} aria-hidden="true" />
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
