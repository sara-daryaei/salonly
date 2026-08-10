import { redirect } from "next/navigation";
import { StaffShell } from "@/components/staff-shell";
import { canAccessAdmin, getInternalSession } from "@/lib/internal-auth";
import { validateInternalSession } from "@/lib/internal-db";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await validateInternalSession(await getInternalSession(), { roles: ["staff"], requireStaff: true });
  if (!session) redirect("/login");
  if (canAccessAdmin(session)) redirect("/admin");
  if (!session.staffId) redirect("/login");
  return <StaffShell session={session}>{children}</StaffShell>;
}
