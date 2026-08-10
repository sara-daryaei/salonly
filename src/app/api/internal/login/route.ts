import { NextResponse } from "next/server";
import { setInternalSession } from "@/lib/internal-auth";
import { authenticateInternalUser } from "@/lib/internal-db";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const session = await authenticateInternalUser(email, password);

  if (!session) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url), { status: 303 });
  }

  await setInternalSession(session);
  const target = session.role === "staff" ? "/staff" : "/admin";
  return NextResponse.redirect(new URL(target, request.url), { status: 303 });
}
