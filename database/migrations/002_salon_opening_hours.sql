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

insert into salon_opening_hours (day_of_week, open_time, close_time, active)
values
  (0, null, null, false),
  (1, null, null, false),
  (2, '09:00', '18:00', true),
  (3, '09:00', '18:00', true),
  (4, '09:00', '20:00', true),
  (5, '09:00', '19:00', true),
  (6, '09:00', '18:00', true)
on conflict (day_of_week) do nothing;
