import { StaffDashboard } from "@/components/staff-dashboard";
import { listAdminServices } from "@/lib/internal/admin";
import { getStaffDashboardData } from "@/lib/internal-db";
import { requireStaffSession } from "@/lib/internal-route-guards";

export default async function StaffPage() {
  const session = await requireStaffSession();
  const [data, services] = await Promise.all([getStaffDashboardData(session.staffId!), listAdminServices()]);
  const staffServices = services.filter((service) => {
    const staffIds = Array.isArray(service.staff_ids) ? service.staff_ids.map(String) : [];
    return Boolean(service.active) && staffIds.includes(session.staffId!);
  });
  return <StaffDashboard data={JSON.parse(JSON.stringify(data))} session={session} services={JSON.parse(JSON.stringify(staffServices))} />;
}
