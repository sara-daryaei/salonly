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

export async function listActiveProducts() {
  const db = requireDatabase();
  return db`
    select id::text, name, sku, sale_price, stock_quantity
    from products
    where active = true
    order by name
  `;
}

export async function listProductSales(filter: { staffId?: string; dateFrom?: string; dateTo?: string } = {}) {
  const db = requireDatabase();
  return db`
    select ps.id::text, ps.product_id::text, p.name, ps.staff_id, ps.customer_id::text, ps.appointment_id::text,
      ps.quantity, ps.unit_price, ps.total_price, ps.payment_method, ps.created_at::text
    from product_sales ps
    join products p on p.id = ps.product_id
    where (${filter.staffId ?? null}::text is null or ps.staff_id = ${filter.staffId ?? null})
      and (${filter.dateFrom ?? null}::text is null or ps.created_at >= ${filter.dateFrom ?? null}::date)
      and (${filter.dateTo ?? null}::text is null or ps.created_at < (${filter.dateTo ?? null}::date + interval '1 day'))
    order by ps.created_at desc
  `;
}
