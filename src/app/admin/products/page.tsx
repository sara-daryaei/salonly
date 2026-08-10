import { ProductEditor, StockAdjuster } from "@/components/admin-controls";
import { listProducts } from "@/lib/internal/products";
import { requireAdminSession } from "@/lib/internal-route-guards";

export default async function AdminProductsPage() {
  await requireAdminSession();
  const rows = await listProducts();
  return (
    <>
      <header className="border-b border-black/10 bg-white px-5 py-5 lg:px-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6b7772]">Admin products</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Retail inventory</h1></header>
      <div className="space-y-5 p-5 lg:p-8"><section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-semibold">Create product</h2><ProductEditor /></section>{rows.map((product) => <article key={String(product.id)} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">{String(product.name)} · stock {String(product.stock_quantity)}</h2><p className="text-sm font-bold">{Number(product.stock_quantity) <= 5 ? "Low stock" : `Sold ${String(product.sold_quantity)} · ${money(Number(product.sold_total))}`}</p></div><ProductEditor product={product as Record<string, unknown>} /><div className="mt-5 border-t border-black/10 pt-5"><StockAdjuster productId={String(product.id)} /></div></article>)}</div>
    </>
  );
}

function money(value: number) { return `EUR ${Math.round(value).toLocaleString("en-BE")}`; }
