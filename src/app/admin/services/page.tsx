import { InternalResourcePage } from "@/components/internal-resource-page";
import { listServices } from "@/lib/internal/services";

export default async function AdminServicesPage() {
  const rows = await listServices();
  return (
    <InternalResourcePage
      eyebrow="Service catalog"
      title="Services"
      description="Database service catalog used by public booking and staff completion."
      rows={rows}
      empty="No services found."
      columns={[
        { key: "name", label: "Name", render: (row) => <strong>{String(row.name)}</strong> },
        { key: "category", label: "Category", render: (row) => String(row.category) },
        { key: "duration", label: "Duration", render: (row) => `${String(row.duration)} min` },
        { key: "price", label: "Price", render: (row) => `EUR ${String(row.price)}` },
        { key: "active", label: "Active", render: (row) => row.active ? "Yes" : "No" },
      ]}
    />
  );
}
