import { InternalResourcePage } from "@/components/internal-resource-page";
import { listStaffSchedules } from "@/lib/internal/schedules";
import { requireStaffSession } from "@/lib/internal-route-guards";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function StaffSchedulePage() {
  const session = await requireStaffSession();
  const rows = await listStaffSchedules({ staffId: session.staffId! });
  return (
    <InternalResourcePage
      eyebrow="My schedule"
      title="Working hours"
      description="Your active working windows from PostgreSQL."
      rows={rows}
      empty="No working hours found for your profile."
      columns={[
        { key: "day", label: "Day", render: (row) => days[Number(row.day_of_week)] },
        { key: "start", label: "Start", render: (row) => String(row.start_time).slice(0, 5) },
        { key: "end", label: "End", render: (row) => String(row.end_time).slice(0, 5) },
        { key: "lunch", label: "Lunch", render: (row) => row.lunch_start && row.lunch_end ? `${String(row.lunch_start).slice(0, 5)}-${String(row.lunch_end).slice(0, 5)}` : "" },
        { key: "active", label: "Active", render: (row) => row.active ? "Yes" : "No" },
      ]}
    />
  );
}
