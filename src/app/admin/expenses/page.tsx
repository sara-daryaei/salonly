import { ActionForm, ExpenseEditor } from "@/components/admin-controls";
import { listExpenses } from "@/lib/internal/expenses";
import { requireAdminSession } from "@/lib/internal-route-guards";

export default async function AdminExpensesPage() {
  await requireAdminSession();
  const rows = await listExpenses();
  return (
    <>
      <header className="border-b border-black/10 bg-white px-5 py-5 lg:px-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6b7772]">Admin expenses</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Expenses with audit logs</h1></header>
      <div className="space-y-5 p-5 lg:p-8">
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-semibold">Create expense</h2><ActionForm endpoint="/api/admin/expenses" method="POST" submitLabel="Create expense" transform={(fd) => ({ category: fd.get("category") as string, description: fd.get("description") as string, supplier: fd.get("supplier") as string, amount: Number(fd.get("amount")), expenseDate: fd.get("expenseDate") as string })}><div className="grid gap-2 md:grid-cols-5"><input name="category" placeholder="Category" className={inputClass} /><input name="description" placeholder="Description" className={inputClass} /><input name="supplier" placeholder="Supplier" className={inputClass} /><input name="amount" type="number" step="0.01" placeholder="Amount" className={inputClass} /><input name="expenseDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} /></div></ActionForm></section>
        {rows.map((expense) => <article key={String(expense.id)} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"><ExpenseEditor expense={expense as Record<string, unknown>} /></article>)}
      </div>
    </>
  );
}

const inputClass = "rounded-xl border border-black/10 px-3 py-2 text-sm";
