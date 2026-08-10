import { redirect } from "next/navigation";
import { StaffDashboard } from "@/components/staff-dashboard";
import { canAccessAdmin, getInternalSession } from "@/lib/internal-auth";
import { getStaffDashboardData, validateInternalSession } from "@/lib/internal-db";

export default async function StaffPage() {
  const session = await validateInternalSession(await getInternalSession(), { roles: ["staff"], requireStaff: true });
  if (!session) redirect("/login");
  if (canAccessAdmin(session)) redirect("/admin");
  if (!session.staffId) redirect("/login");

  const data = await getStaffDashboardData(session.staffId);
  return <StaffDashboard data={JSON.parse(JSON.stringify(data))} session={session} />;
}
