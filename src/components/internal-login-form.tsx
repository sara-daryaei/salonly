"use client";

import Link from "next/link";
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";

type DemoAccount = {
  label: string;
  email: string;
  password: string;
};

type InternalLoginFormProps = {
  hasError: boolean;
  demoAccounts?: DemoAccount[];
};

export function InternalLoginForm({ hasError, demoAccounts = [] }: InternalLoginFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const isSubmittingRef = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (isSubmittingRef.current) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    isSubmittingRef.current = true;
    flushSync(() => setIsSubmitting(true));
    window.setTimeout(() => formRef.current?.submit(), 120);
  }

  return (
    <form
      ref={formRef}
      action="/api/internal/login"
      method="post"
      onSubmit={handleSubmit}
      aria-describedby={hasError ? errorId : undefined}
      className="w-full max-w-[420px]"
    >
      <div className="mb-8">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d9cabb] bg-[#fbf8f3] text-[#3a251a] shadow-sm">
          <LockKeyhole size={20} aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9a7048]">Maison Elegance</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-normal text-[#2d1c14]">Welcome back</h1>
        <p className="mt-3 text-base leading-7 text-[#6d584b]">Sign in to your salon workspace.</p>
      </div>

      {hasError ? (
        <p id={errorId} aria-live="polite" className="mb-5 rounded-2xl border border-[#e8c7ba] bg-[#fff4ef] px-4 py-3 text-sm font-semibold text-[#8c3a24]">
          Unable to sign in. Check your email and password and try again.
        </p>
      ) : null}

      <div className="space-y-5">
        <label htmlFor={emailId} className="block text-sm font-semibold text-[#3a251a]">
          Email address
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          aria-invalid={hasError}
          className="h-12 w-full rounded-2xl border border-[#d8cbbd] bg-white px-4 text-base text-[#2d1c14] outline-none transition placeholder:text-[#9b8d82] focus:border-[#3a251a] focus:ring-4 focus:ring-[#c8a06d]/20"
          placeholder="name@example.com"
        />

        <div>
          <div className="mb-2 flex items-center justify-between gap-4">
            <label htmlFor={passwordId} className="block text-sm font-semibold text-[#3a251a]">
              Password
            </label>
            <Link href="/forgot-password" className="rounded-lg text-sm font-semibold text-[#7f5835] outline-none transition hover:text-[#3a251a] focus-visible:ring-4 focus-visible:ring-[#c8a06d]/25">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id={passwordId}
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              aria-invalid={hasError}
              className="h-12 w-full rounded-2xl border border-[#d8cbbd] bg-white px-4 pr-14 text-base text-[#2d1c14] outline-none transition placeholder:text-[#9b8d82] focus:border-[#3a251a] focus:ring-4 focus:ring-[#c8a06d]/20"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-[#6d584b] outline-none transition hover:bg-[#f3ece4] hover:text-[#2d1c14] focus-visible:ring-4 focus-visible:ring-[#c8a06d]/25"
            >
              {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="mt-7 flex h-13 min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#2d1c14] px-5 text-base font-bold text-white shadow-[0_12px_28px_rgba(45,28,20,0.18)] outline-none transition hover:bg-[#3a251a] focus-visible:ring-4 focus-visible:ring-[#c8a06d]/35 disabled:cursor-wait disabled:bg-[#6d584b]"
      >
        {isSubmitting ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : null}
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>

      {demoAccounts.length ? (
        <section className="mt-7 border-t border-[#e3d8cc] pt-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9a7048]">Demo access</p>
          <div className="mt-3 grid gap-3">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
                className="min-h-11 rounded-2xl border border-[#d8cbbd] px-4 py-3 text-left text-sm font-semibold text-[#3a251a] outline-none transition hover:border-[#a9825d] hover:bg-[#fbf8f3] focus-visible:ring-4 focus-visible:ring-[#c8a06d]/25"
              >
                Fill {account.label.toLowerCase()} account
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <p className="mt-7 flex items-center gap-2 text-sm text-[#6d584b]">
        <LockKeyhole size={15} aria-hidden="true" />
        Secure access for Maison Elegance staff and management.
      </p>
    </form>
  );
}
