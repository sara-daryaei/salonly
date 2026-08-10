import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminShell } from "@/components/admin-shell";
import { redirect } from "next/navigation";
import { canAccessAdmin, getInternalSession } from "@/lib/internal-auth";
import { getAdminDashboardData, validateInternalSession } from "@/lib/internal-db";

export default async function AdminPage() {
  const session = await validateInternalSession(await getInternalSession(), { roles: ["manager", "admin"] });
  if (!session) redirect("/login");
  if (!canAccessAdmin(session)) redirect("/staff");
  const data = await getAdminDashboardData();

  return (
    <AdminShell session={session}>
      <AdminDashboard data={JSON.parse(JSON.stringify(data))} />
    </AdminShell>
  );
}
