import { SettingsEditor } from "@/components/admin-controls";
import { listSalonOpeningHours } from "@/lib/internal/schedules";
import { getSalonSettings } from "@/lib/internal/settings";
import { requireAdminSession } from "@/lib/internal-route-guards";

export default async function AdminSettingsPage() {
  await requireAdminSession();
  const [settings, hours] = await Promise.all([getSalonSettings(), listSalonOpeningHours()]);
  return (
    <>
      <header className="border-b border-black/10 bg-white px-5 py-5 lg:px-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6b7772]">Admin settings</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Salon settings and opening hours</h1></header>
      <div className="p-5 lg:p-8"><section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">{settings ? <SettingsEditor settings={settings as Record<string, unknown>} hours={hours as Record<string, unknown>[]} /> : <p>No salon settings row found.</p>}</section></div>
    </>
  );
}
