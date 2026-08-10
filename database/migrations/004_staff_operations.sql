alter type appointment_status add value if not exists 'in_progress';

create index if not exists appointments_staff_start_idx
  on appointments (staff_id, start_at);

create index if not exists customer_notes_customer_created_idx
  on customer_notes (customer_id, created_at desc);

create index if not exists staff_work_logs_open_session_idx
  on staff_work_logs (staff_id)
  where clock_out is null;
