import { AdminDashboard } from "@/components/admin-dashboard";
import { getAdminDashboardData } from "@/lib/internal-db";

export default async function AdminExpensesPage() {
  const data = await getAdminDashboardData();
  return <AdminDashboard data={JSON.parse(JSON.stringify(data))} initialSection="expenses" />;
}
