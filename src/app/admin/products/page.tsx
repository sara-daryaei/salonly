import { InternalResourcePage } from "@/components/internal-resource-page";
import { listProducts } from "@/lib/internal/products";

export default async function AdminProductsPage() {
  const rows = await listProducts();
  return (
    <InternalResourcePage
      eyebrow="Retail inventory"
      title="Products"
      description="Product inventory from PostgreSQL. Product editing is not available yet."
      rows={rows}
      empty="No products have been added yet."
      columns={[
        { key: "name", label: "Name", render: (row) => <strong>{String(row.name)}</strong> },
        { key: "sku", label: "SKU", render: (row) => String(row.sku ?? "") },
        { key: "stock", label: "Stock", render: (row) => String(row.stock_quantity) },
        { key: "price", label: "Sale price", render: (row) => `EUR ${String(row.sale_price)}` },
        { key: "sold", label: "Sold", render: (row) => String(row.sold_quantity) },
      ]}
    />
  );
}
