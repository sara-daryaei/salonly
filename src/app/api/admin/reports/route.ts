import { NextResponse } from "next/server";
import { getInternalSession } from "@/lib/internal-auth";
import { validateInternalSession } from "@/lib/internal-db";
import { adminApiGuard, csv, getAdminRange, listAdminReports } from "@/lib/internal/admin";

export async function GET(request: Request) {
  const session = await validateInternalSession(await getInternalSession(), { roles: ["manager", "admin"] });
  const denied = adminApiGuard(session);
  if (denied) return denied;
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const reports = await listAdminReports(getAdminRange(params));
  const rows = Object.entries(reports).flatMap(([report, items]) =>
    (items as Record<string, unknown>[]).map((item) => ({ report, ...item })),
  );
  return new NextResponse(csv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=salonly-admin-reports.csv",
    },
  });
}
