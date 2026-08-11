alter table product_sales
  alter column payment_method drop default;

do $$
declare
  migration_applied_at timestamptz;
begin
  select applied_at into migration_applied_at
  from schema_migrations
  where id = '007_business_data_integrity.sql';

  update product_sales
  set payment_method = 'unknown'
  where payment_method = 'card'
    and migration_applied_at is not null
    and created_at < migration_applied_at;
end $$;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'product_sales_payment_method_allowed'
  ) then
    alter table product_sales drop constraint product_sales_payment_method_allowed;
  end if;

  alter table product_sales
    add constraint product_sales_payment_method_allowed
    check (payment_method in ('cash', 'card', 'bancontact', 'online', 'other', 'unknown')) not valid;
end $$;
