alter type appointment_status add value if not exists 'in_progress';

create index if not exists appointments_staff_start_idx
  on appointments (staff_id, start_at);

create index if not exists customer_notes_customer_created_idx
  on customer_notes (customer_id, created_at desc);

create index if not exists staff_work_logs_open_session_idx
  on staff_work_logs (staff_id)
  where clock_out is null;

alter table appointments drop constraint if exists appointments_no_staff_overlap;

alter table appointments
  add constraint appointments_no_staff_overlap
  exclude using gist (
    staff_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  )
  where (status in ('pending', 'confirmed', 'in_progress'));
