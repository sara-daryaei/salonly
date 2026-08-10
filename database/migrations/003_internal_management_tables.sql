create table if not exists salon_settings (
  id text primary key default 'maison-elegance',
  salon_name text not null,
  logo_url text,
  cover_image_url text,
  description text not null,
  address text not null,
  phone text not null,
  email text not null,
  website text,
  instagram_url text,
  facebook_url text,
  opening_hours jsonb not null default '{}',
  minimum_booking_notice_minutes integer not null default 120,
  maximum_booking_period_days integer not null default 90,
  cancellation_deadline_hours integer not null default 24,
  appointment_slot_interval_minutes integer not null default 30,
  updated_at timestamptz not null default now()
);

insert into salon_settings (id, salon_name, description, address, phone, email, website, opening_hours)
values (
  'maison-elegance',
  'Maison Elegance',
  'Premium Brussels salon internal workspace.',
  'Avenue Louise 120, 1050 Brussels, Belgium',
  '+32 2 468 18 55',
  'hello@maisonelegance.be',
  'https://demo.droomit.be',
  '{}'::jsonb
)
on conflict (id) do nothing;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique,
  cost_price numeric not null default 0,
  sale_price numeric not null default 0,
  stock_quantity integer not null default 0,
  active boolean not null default true
);

create table if not exists product_sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  staff_id text references staff(id),
  customer_id uuid references customers(id),
  appointment_id uuid references appointments(id),
  quantity integer not null,
  unit_price numeric not null,
  total_price numeric not null,
  created_at timestamptz not null default now()
);
