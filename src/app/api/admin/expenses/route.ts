import { NextResponse } from "next/server";
import { canAccessAdmin, getInternalSession } from "@/lib/internal-auth";
import { createExpense } from "@/lib/internal-db";

export async function POST(request: Request) {
  const session = await getInternalSession();
  if (!canAccessAdmin(session) || !session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const id = await createExpense({
    actorProfileId: session.profileId,
    category: String(body.category ?? "General"),
    description: String(body.description ?? ""),
    amount: Number(body.amount ?? 0),
    supplier: String(body.supplier ?? ""),
    expenseDate: String(body.expenseDate ?? new Date().toISOString().slice(0, 10)),
  });

  return NextResponse.json({ ok: true, id });
}
