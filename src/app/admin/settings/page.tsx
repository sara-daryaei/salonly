import { InternalResourcePage } from "@/components/internal-resource-page";
import { listSalonOpeningHours } from "@/lib/internal/schedules";
import { getSalonSettings } from "@/lib/internal/settings";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function AdminSettingsPage() {
  const [settings, hours] = await Promise.all([getSalonSettings(), listSalonOpeningHours()]);
  return (
    <>
      <InternalResourcePage
        eyebrow="Salon settings"
        title={settings ? String(settings.salon_name) : "Maison Elegance settings"}
        description="Core salon settings and opening hours from PostgreSQL. Editing settings is not available yet."
        rows={hours}
        empty="No opening hours found."
        columns={[
          { key: "day", label: "Day", render: (row) => dayNames[Number(row.day_of_week)] },
          { key: "active", label: "Open", render: (row) => row.active ? "Yes" : "No" },
          { key: "open", label: "Open time", render: (row) => String(row.open_time ?? "") },
          { key: "close", label: "Close time", render: (row) => String(row.close_time ?? "") },
        ]}
      />
    </>
  );
}
