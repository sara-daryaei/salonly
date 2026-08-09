create extension if not exists btree_gist;

do $$ begin
  create type user_role as enum ('customer', 'staff', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
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

do $$ begin
  alter table appointments
    add constraint appointments_no_staff_overlap
    exclude using gist (
      staff_id with =,
      tstzrange(start_at, end_at, '[)') with &&
    )
    where (status in ('pending', 'confirmed'));
exception
  when duplicate_object then null;
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
