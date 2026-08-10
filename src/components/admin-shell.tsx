import Link from "next/link";
import { Banknote, BarChart3, CalendarDays, LayoutDashboard, LogOut, Package, ReceiptText, Scissors, Settings, Users } from "lucide-react";
import type { InternalSession } from "@/lib/internal-auth";

export function AdminShell({ children, session }: { children: React.ReactNode; session: InternalSession }) {
  const nav = [
    ["Overview", "/admin", LayoutDashboard],
    ["Calendar", "/admin/calendar", CalendarDays],
    ["Appointments", "/admin/appointments", CalendarDays],
    ["Customers", "/admin/customers", Users],
    ["Staff", "/admin/staff", Users],
    ["Services", "/admin/services", Scissors],
    ["Products", "/admin/products", Package],
    ["Payments", "/admin/payments", Banknote],
    ["Expenses", "/admin/expenses", ReceiptText],
    ["Reports", "/admin/reports", BarChart3],
    ["Settings", "/admin/settings", Settings],
  ];

  return (
    <main className="min-h-screen bg-[#f5f7f6] text-[#17211f]">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-black/10 bg-white p-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#173d35] text-white"><Scissors size={18} /></span>
            <span><span className="block font-semibold">Maison Admin</span><span className="text-xs text-[#52605b]">{session.name}</span></span>
          </Link>
          <nav className="mt-8 space-y-1">
            {nav.map(([label, href, Icon]) => (
              <Link key={label as string} href={href as string} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#52605b] hover:bg-[#eef4ef]">
                <Icon size={17} /> {label as string}
              </Link>
            ))}
          </nav>
          <form action="/api/internal/logout" method="post" className="mt-8">
            <button className="flex w-full items-center gap-3 rounded-xl border border-black/10 px-3 py-3 text-sm font-semibold text-[#52605b] hover:bg-[#eef4ef]">
              <LogOut size={17} /> Logout
            </button>
          </form>
        </aside>
        <section>{children}</section>
      </div>
    </main>
  );
}
