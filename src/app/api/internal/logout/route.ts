import { NextResponse } from "next/server";
import { clearInternalSession } from "@/lib/internal-auth";

export async function POST(request: Request) {
  await clearInternalSession();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
