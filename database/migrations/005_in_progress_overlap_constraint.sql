alter table appointments drop constraint if exists appointments_no_staff_overlap;

alter table appointments
  add constraint appointments_no_staff_overlap
  exclude using gist (
    staff_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  )
  where (status in ('pending', 'confirmed', 'in_progress'));
