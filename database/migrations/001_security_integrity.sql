create extension if not exists btree_gist;

do $$ begin
  create type appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null;
end $$;

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

alter table appointments add column if not exists discount numeric not null default 0;
alter table staff add column if not exists hire_date date;
alter table customers add column if not exists birth_date date;

do $$ begin
  alter table transactions add constraint transactions_amount_non_negative check (amount >= 0) not valid;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table transactions add constraint transactions_discount_non_negative check (discount >= 0) not valid;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table transactions add constraint transactions_tip_non_negative check (tip >= 0) not valid;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table transactions add constraint transactions_payment_method_allowed check (payment_method in ('cash', 'card', 'bancontact', 'online', 'other')) not valid;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table expenses add constraint expenses_amount_positive check (amount > 0) not valid;
exception when duplicate_object then null;
end $$;

with duplicates as (
  select id, row_number() over (
    partition by staff_id, day_of_week, start_time, end_time, lunch_start, lunch_end
    order by id
  ) as rn
  from staff_working_hours
)
delete from staff_working_hours
where id in (select id from duplicates where rn > 1);

create unique index if not exists staff_working_hours_unique_window
  on staff_working_hours (staff_id, day_of_week, start_time, end_time, coalesce(lunch_start, '00:00'::time), coalesce(lunch_end, '00:00'::time));

with duplicates as (
  select id, row_number() over (
    partition by appointment_id
    order by created_at, id
  ) as rn
  from transactions
  where transaction_type = 'service' and appointment_id is not null
)
update transactions
set transaction_type = 'service_duplicate'
where id in (select id from duplicates where rn > 1);

create unique index if not exists transactions_one_service_payment_per_appointment
  on transactions (appointment_id)
  where transaction_type = 'service' and appointment_id is not null;

create index if not exists login_attempts_key_attempted_at_idx
  on login_attempts (key, attempted_at desc);

create index if not exists audit_logs_created_at_idx
  on audit_logs (created_at desc);
