import { StaffDashboard } from "@/components/staff-dashboard";
import { getStaffDashboardData } from "@/lib/internal-db";
import { requireStaffSession } from "@/lib/internal-route-guards";

export default async function StaffPage() {
  const session = await requireStaffSession();
  const data = await getStaffDashboardData(session.staffId!);
  return <StaffDashboard data={JSON.parse(JSON.stringify(data))} session={session} />;
}
