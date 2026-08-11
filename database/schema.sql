create extension if not exists btree_gist;

do $$ begin
  create type user_role as enum ('customer', 'staff', 'admin');
exception when duplicate_object or duplicate_table then null;
end $$;

do $$ begin
  create type appointment_status as enum ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null;
end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text not null,
  role user_role not null default 'customer',
  locale text not null default 'en',
  created_at timestamptz not null default now()
);

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
  opening_hours jsonb not null,
  minimum_booking_notice_minutes integer not null default 120,
  maximum_booking_period_days integer not null default 90,
  cancellation_deadline_hours integer not null default 24,
  appointment_slot_interval_minutes integer not null default 30,
  updated_at timestamptz not null default now()
);

create table if not exists salon_opening_hours (
  day_of_week integer primary key check (day_of_week between 0 and 6),
  open_time time,
  close_time time,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  check (
    (active = false and open_time is null and close_time is null)
    or (active = true and open_time is not null and close_time is not null and close_time > open_time)
  )
);

create table if not exists services (
  id text primary key,
  name text not null,
  category text not null,
  description text not null,
  price integer not null,
  duration integer not null,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists staff (
  id text primary key,
  user_id uuid references users(id),
  photo_url text,
  first_name text not null,
  last_name text not null,
  job_title text not null,
  bio text not null,
  phone text,
  email text,
  languages text[] not null default '{}',
  specialties text[] not null default '{}',
  active boolean not null default true
);

do $$ begin
  create type internal_role as enum ('staff', 'manager', 'admin');
exception when duplicate_object then null;
end $$;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id text,
  first_name text not null,
  last_name text not null,
  email text unique not null,
  phone text,
  role internal_role not null,
  staff_id text references staff(id),
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists staff_services (
  staff_id text not null references staff(id) on delete cascade,
  service_id text not null references services(id) on delete cascade,
  primary key (staff_id, service_id)
);

create table if not exists staff_working_hours (
  id uuid primary key default gen_random_uuid(),
  staff_id text not null references staff(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  lunch_start time,
  lunch_end time,
  active boolean not null default true
);

create table if not exists staff_time_off (
  id uuid primary key default gen_random_uuid(),
  staff_id text not null references staff(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists customers_normalized_email_idx
  on customers (lower(trim(email)));

create index if not exists customers_normalized_phone_idx
  on customers (regexp_replace(phone, '[^0-9+]', '', 'g'));

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  booking_reference text unique not null,
  customer_id uuid not null references customers(id),
  service_id text not null references services(id),
  staff_id text not null references staff(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  duration integer not null,
  price integer not null,
  status appointment_status not null default 'confirmed',
  notes text,
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

alter table appointments add column if not exists discount numeric not null default 0;

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments(id),
  customer_id uuid references customers(id),
  staff_id text references staff(id),
  amount numeric not null default 0,
  discount numeric not null default 0,
  tip numeric not null default 0,
  payment_method text not null,
  payment_status text not null default 'paid',
  transaction_type text not null default 'service',
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique,
  cost_price numeric not null default 0,
  sale_price numeric not null default 0,
  stock_quantity integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
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
  payment_method text not null,
  created_at timestamptz not null default now(),
  constraint product_sales_payment_method_allowed check (payment_method in ('cash', 'card', 'bancontact', 'online', 'other', 'unknown'))
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  description text not null,
  amount numeric not null,
  expense_date date not null,
  supplier text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

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

create table if not exists expense_audit (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid,
  changed_by uuid references profiles(id),
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists staff_work_logs (
  id uuid primary key default gen_random_uuid(),
  staff_id text references staff(id),
  work_date date not null,
  clock_in timestamptz,
  clock_out timestamptz,
  break_minutes integer not null default 0,
  notes text
);

create table if not exists customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  staff_id text references staff(id),
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists login_attempts (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  ip text not null,
  email text not null,
  success boolean not null,
  profile_id uuid references profiles(id),
  cooldown_until timestamptz,
  attempted_at timestamptz not null default now()
);

create unique index if not exists staff_working_hours_unique_window
  on staff_working_hours (staff_id, day_of_week, start_time, end_time, coalesce(lunch_start, '00:00'::time), coalesce(lunch_end, '00:00'::time));

create unique index if not exists transactions_one_service_payment_per_appointment
  on transactions (appointment_id)
  where transaction_type = 'service' and appointment_id is not null;

create index if not exists login_attempts_key_attempted_at_idx
  on login_attempts (key, attempted_at desc);

create index if not exists audit_logs_created_at_idx
  on audit_logs (created_at desc);

do $$ begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_no_staff_overlap'
      and conrelid = 'appointments'::regclass
  ) then
    alter table appointments
      add constraint appointments_no_staff_overlap
      exclude using gist (
        staff_id with =,
        tstzrange(start_at, end_at, '[)') with &&
      )
      where (status in ('pending', 'confirmed', 'in_progress'));
  end if;
exception
  when duplicate_object or duplicate_table then null;
end $$;

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid unique not null references appointments(id),
  customer_id uuid not null references customers(id),
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  salon_response text,
  created_at timestamptz not null default now()
);
