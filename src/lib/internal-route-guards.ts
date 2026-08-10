import { redirect } from "next/navigation";
import { canAccessAdmin, getInternalSession } from "@/lib/internal-auth";
import { validateInternalSession } from "@/lib/internal-db";

export async function requireAdminSession() {
  const session = await validateInternalSession(await getInternalSession(), { roles: ["manager", "admin"] });
  if (!session) redirect("/login");
  if (!canAccessAdmin(session)) redirect("/staff");
  return session;
}

export async function requireStaffSession() {
  const session = await validateInternalSession(await getInternalSession(), { roles: ["staff"], requireStaff: true });
  if (!session) redirect("/login");
  if (canAccessAdmin(session)) redirect("/admin");
  if (!session.staffId) redirect("/login");
  return session;
}
