import Link from "next/link";
import { BarChart3, CalendarCheck, CalendarDays, Clock, LogOut, Scissors, Users } from "lucide-react";
import type { InternalSession } from "@/lib/internal-auth";

export function StaffShell({ children, session }: { children: React.ReactNode; session: InternalSession }) {
  const nav = [
    ["Overview", "/staff", CalendarCheck],
    ["Appointments", "/staff/appointments", CalendarCheck],
    ["Calendar", "/staff/calendar", CalendarDays],
    ["Customers", "/staff/customers", Users],
    ["Schedule", "/staff/schedule", Clock],
    ["Performance", "/staff/performance", BarChart3],
  ];

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#17211f]">
      <header className="border-b border-black/10 bg-white px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/staff" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#2f4f46] text-white"><Scissors size={18} /></span>
            <span><span className="block text-sm font-semibold">Maison Elegance Staff</span><span className="text-xs text-[#64736d]">{session.name}</span></span>
          </Link>
          <form action="/api/internal/logout" method="post">
            <button className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-4 py-2 text-sm font-bold"><LogOut size={16} /> Logout</button>
          </form>
        </div>
        <nav className="mx-auto mt-4 flex max-w-7xl gap-2 overflow-x-auto pb-1">
          {nav.map(([label, href, Icon]) => (
            <Link key={label as string} href={href as string} className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#52605b] hover:bg-[#eef4ef]">
              <Icon size={16} /> {label as string}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </main>
  );
}
