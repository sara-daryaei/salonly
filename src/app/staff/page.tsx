import { redirect } from "next/navigation";
import { StaffDashboard } from "@/components/staff-dashboard";
import { canAccessAdmin, getInternalSession } from "@/lib/internal-auth";
import { getStaffDashboardData } from "@/lib/internal-db";

export default async function StaffPage() {
  const session = await getInternalSession();
  if (!session) redirect("/login");
  if (canAccessAdmin(session)) redirect("/admin");
  if (!session.staffId) redirect("/login");

  const data = await getStaffDashboardData(session.staffId);
  return <StaffDashboard data={JSON.parse(JSON.stringify(data))} session={session} />;
}
