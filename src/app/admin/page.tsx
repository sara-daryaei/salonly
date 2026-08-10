import { AdminDashboard } from "@/components/admin-dashboard";
import { getAdminDashboardData } from "@/lib/internal-db";
import { requireAdminSession } from "@/lib/internal-route-guards";

export default async function AdminPage() {
  await requireAdminSession();
  const data = await getAdminDashboardData();
  return <AdminDashboard data={JSON.parse(JSON.stringify(data))} />;
}
