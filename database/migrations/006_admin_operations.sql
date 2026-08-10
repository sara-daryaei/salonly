alter table products add column if not exists updated_at timestamptz not null default now();

create table if not exists product_inventory_audit (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  changed_by uuid references profiles(id),
  quantity_before integer not null,
  quantity_after integer not null,
  delta integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists product_inventory_audit_product_created_idx
  on product_inventory_audit (product_id, created_at desc);

create table if not exists expense_audit (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid,
  changed_by uuid references profiles(id),
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists expense_audit_expense_created_idx
  on expense_audit (expense_id, created_at desc);
