import { NextResponse } from "next/server";
import { clearInternalSession, getInternalSession } from "@/lib/internal-auth";
import { recordAuditLog } from "@/lib/internal-db";

export async function POST(request: Request) {
  const session = await getInternalSession();
  if (session) {
    await recordAuditLog({ userId: session.profileId, action: "logout", entityType: "auth" });
  }
  await clearInternalSession();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
