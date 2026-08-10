import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { canAccessAdmin, getInternalSession } from "@/lib/internal-auth";
import { validateInternalSession } from "@/lib/internal-db";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await validateInternalSession(await getInternalSession(), { roles: ["manager", "admin"] });
  if (!session) redirect("/login");
  if (!canAccessAdmin(session)) redirect("/staff");
  return <AdminShell session={session}>{children}</AdminShell>;
}
