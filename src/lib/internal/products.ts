import { requireDatabase } from "@/lib/db";

export async function listProducts() {
  const db = requireDatabase();
  return db`
    select p.id::text, p.name, p.sku, p.cost_price, p.sale_price, p.stock_quantity, p.active,
      coalesce(sum(ps.quantity), 0)::int as sold_quantity,
      coalesce(sum(ps.total_price), 0)::numeric as sold_total
    from products p
    left join product_sales ps on ps.product_id = p.id
    group by p.id
    order by p.name
  `;
}
