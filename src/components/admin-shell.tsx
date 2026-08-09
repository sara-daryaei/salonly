import Link from "next/link";
import { CalendarDays, LayoutDashboard, Scissors, Settings, Star, Users } from "lucide-react";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const nav = [
    ["Overview", "/admin", LayoutDashboard],
    ["Calendar", "/admin#calendar", CalendarDays],
    ["Appointments", "/admin#appointments", CalendarDays],
    ["Customers", "/admin#customers", Users],
    ["Services", "/admin#services", Scissors],
    ["Reviews", "/admin#reviews", Star],
    ["Settings", "/admin#settings", Settings],
  ];

  return (
    <main className="min-h-screen bg-[#f5f7f6] text-[#17211f]">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-black/10 bg-white p-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#173d35] text-white"><Scissors size={18} /></span>
            <span className="font-semibold">Maison Admin</span>
          </Link>
          <nav className="mt-8 space-y-1">
            {nav.map(([label, href, Icon]) => (
              <Link key={label as string} href={href as string} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#52605b] hover:bg-[#eef4ef]">
                <Icon size={17} /> {label as string}
              </Link>
            ))}
          </nav>
        </aside>
        <section>{children}</section>
      </div>
    </main>
  );
}
