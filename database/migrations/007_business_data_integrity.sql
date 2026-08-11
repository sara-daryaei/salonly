create index if not exists customers_normalized_email_idx
  on customers (lower(trim(email)));

create index if not exists customers_normalized_phone_idx
  on customers (regexp_replace(phone, '[^0-9+]', '', 'g'));

alter table product_sales
  add column if not exists payment_method text not null default 'card';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_sales_payment_method_allowed'
  ) then
    alter table product_sales
      add constraint product_sales_payment_method_allowed
      check (payment_method in ('cash', 'card', 'bancontact', 'online', 'other')) not valid;
  end if;
end $$;
