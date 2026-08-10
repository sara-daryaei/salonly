import { NextResponse } from "next/server";
import { getInternalSession } from "@/lib/internal-auth";
import { createExpense, validateInternalSession, ValidationError } from "@/lib/internal-db";

export async function POST(request: Request) {
  const session = await validateInternalSession(await getInternalSession(), { roles: ["manager", "admin"] });
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  try {
    const id = await createExpense({
      actorProfileId: session.profileId,
      category: String(body.category ?? ""),
      description: String(body.description ?? ""),
      amount: Number(body.amount ?? 0),
      supplier: String(body.supplier ?? ""),
      expenseDate: String(body.expenseDate ?? ""),
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
