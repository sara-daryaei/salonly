type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
};

export function InternalResourcePage<T>({
  eyebrow,
  title,
  description,
  rows,
  columns,
  empty,
}: {
  eyebrow: string;
  title: string;
  description: string;
  rows: T[];
  columns: Column<T>[];
  empty: string;
}) {
  return (
    <>
      <header className="border-b border-black/10 bg-white px-5 py-5 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6b7772]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52605b]">{description}</p>
      </header>
      <div className="p-5 lg:p-8">
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          {rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-[#52605b]">
                  <tr>{columns.map((column) => <th key={column.key} className="border-b border-black/10 py-3 pr-4">{column.label}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index}>
                      {columns.map((column) => <td key={column.key} className="border-b border-black/5 py-3 pr-4">{column.render(row)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-black/15 p-5 text-sm font-semibold text-[#64736d]">{empty}</p>
          )}
        </section>
      </div>
    </>
  );
}

export function NotAvailableYet({ title, description }: { title: string; description: string }) {
  return (
    <>
      <header className="border-b border-black/10 bg-white px-5 py-5 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6b7772]">Not available yet</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52605b]">{description}</p>
      </header>
      <div className="p-5 lg:p-8">
        <section className="rounded-2xl border border-dashed border-black/15 bg-white p-6 text-sm font-semibold text-[#64736d] shadow-sm">
          This page is intentionally present as a real protected route, but editing tools for this feature are not available yet.
        </section>
      </div>
    </>
  );
}
