import { NextResponse } from "next/server";
import { setInternalSession } from "@/lib/internal-auth";
import { authenticateInternalUser, recordAuditLog } from "@/lib/internal-db";
import { checkLoginRateLimit, getClientIp, recordLoginAttempt } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const ip = getClientIp(request);
  const rateKey = `${ip}:${email}`;

  if (!(await checkLoginRateLimit(rateKey))) {
    await recordAuditLog({ action: "login_rate_limited", entityType: "auth", metadata: { email, ip } });
    return NextResponse.redirect(new URL("/login?error=invalid", request.url), { status: 303 });
  }

  const result = await authenticateInternalUser(email, password);

  if (!result.session) {
    await recordLoginAttempt({ key: rateKey, ip, email, success: false, profileId: result.profileId });
    await recordAuditLog({ userId: result.profileId, action: result.reason === "disabled" ? "login_disabled_account" : "login_failed", entityType: "auth", metadata: { email, ip } });
    return NextResponse.redirect(new URL("/login?error=invalid", request.url), { status: 303 });
  }

  await recordLoginAttempt({ key: rateKey, ip, email, success: true, profileId: result.session.profileId });
  await recordAuditLog({ userId: result.session.profileId, action: "login_success", entityType: "auth", metadata: { email, ip } });
  await setInternalSession(result.session);
  const target = result.session.role === "staff" ? "/staff" : "/admin";
  return NextResponse.redirect(new URL(target, request.url), { status: 303 });
}
