import assert from "node:assert/strict";
import { test } from "node:test";
import postgres from "postgres";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

test("integration: protected DB integrity rules on isolated database", { skip: testDatabaseUrl ? false : "Set TEST_DATABASE_URL to run DB integration tests." }, async () => {
  const sql = postgres(testDatabaseUrl!, { ssl: "require", max: 1 });
  const schema = `salonly_test_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  try {
    await sql.unsafe(`create schema ${schema}`);
    await sql.unsafe(`set search_path to ${schema}`);
    await sql`create extension if not exists btree_gist`;
    await sql`create type appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')`;
    await sql`create type internal_role as enum ('staff', 'manager', 'admin')`;
    await sql`create table staff (id text primary key, active boolean not null default true)`;
    await sql`create table customers (id uuid primary key default gen_random_uuid())`;
    await sql`create table appointments (id uuid primary key default gen_random_uuid(), customer_id uuid references customers(id), staff_id text references staff(id), status appointment_status not null default 'confirmed')`;
    await sql`create table profiles (id uuid primary key default gen_random_uuid(), role internal_role not null, staff_id text references staff(id), active boolean not null default true)`;
    await sql`create table transactions (id uuid primary key default gen_random_uuid(), appointment_id uuid references appointments(id), customer_id uuid references customers(id), staff_id text references staff(id), amount numeric not null check (amount >= 0), discount numeric not null check (discount >= 0), tip numeric not null check (tip >= 0), payment_method text not null check (payment_method in ('cash', 'card', 'bancontact', 'online', 'other')), transaction_type text not null default 'service')`;
    await sql`create unique index transactions_one_service_payment_per_appointment on transactions (appointment_id) where transaction_type = 'service' and appointment_id is not null`;
    await sql`create table login_attempts (id uuid primary key default gen_random_uuid(), key text not null, ip text not null, email text not null, success boolean not null, attempted_at timestamptz not null default now())`;

    await sql`insert into staff (id) values ('staff-a'), ('staff-b')`;
    const [customer] = await sql`insert into customers default values returning id`;
    const [appointment] = await sql`insert into appointments (customer_id, staff_id, status) values (${customer.id}, 'staff-a', 'confirmed') returning id`;

    const first = await sql.begin(async (tx) => {
      const updated = await tx`update appointments set status = 'completed' where id = ${appointment.id} and staff_id = 'staff-a' and status in ('pending', 'confirmed') returning id`;
      if (!updated[0]) return false;
      await tx`insert into transactions (appointment_id, customer_id, staff_id, amount, discount, tip, payment_method, transaction_type) values (${appointment.id}, ${customer.id}, 'staff-a', 55, 0, 10, 'card', 'service')`;
      return true;
    });
    assert.equal(first, true);

    const second = await sql.begin(async (tx) => {
      const updated = await tx`update appointments set status = 'completed' where id = ${appointment.id} and staff_id = 'staff-a' and status in ('pending', 'confirmed') returning id`;
      return Boolean(updated[0]);
    });
    assert.equal(second, false);

    await assert.rejects(
      () => sql`insert into transactions (appointment_id, customer_id, staff_id, amount, discount, tip, payment_method, transaction_type) values (${appointment.id}, ${customer.id}, 'staff-a', 55, 0, 10, 'card', 'service')`,
      /duplicate key|unique/i,
    );

    await assert.rejects(
      () => sql`insert into transactions (appointment_id, customer_id, staff_id, amount, discount, tip, payment_method, transaction_type) values (null, ${customer.id}, 'staff-a', -1, 0, 0, 'card', 'service')`,
      /check|constraint/i,
    );
  } finally {
    await sql.unsafe(`drop schema if exists ${schema} cascade`);
    await sql.end();
  }
});
