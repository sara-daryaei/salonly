import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { canTransitionAppointment, validateExpenseInput, validatePaymentInput } from "../src/lib/security-rules";
import { mergeStaffReportingRows } from "../src/lib/reporting";

test("staff appointment status transitions are restricted", () => {
  assert.equal(canTransitionAppointment("pending", "confirmed"), true);
  assert.equal(canTransitionAppointment("confirmed", "completed"), true);
  assert.equal(canTransitionAppointment("completed", "cancelled"), false);
  assert.equal(canTransitionAppointment("completed", "no_show"), false);
  assert.equal(canTransitionAppointment("cancelled", "completed"), false);
});

test("payment input rejects negative, invalid and arbitrary methods", () => {
  assert.equal(validatePaymentInput({ amount: 55, discount: 0, tip: 10, paymentMethod: "card" }).ok, true);
  assert.equal(validatePaymentInput({ amount: -1, discount: 0, tip: 0, paymentMethod: "card" }).ok, false);
  assert.equal(validatePaymentInput({ amount: Number.NaN, discount: 0, tip: 0, paymentMethod: "card" }).ok, false);
  assert.equal(validatePaymentInput({ amount: 55, discount: 56, tip: 0, paymentMethod: "card" }).ok, false);
  assert.equal(validatePaymentInput({ amount: 55, discount: 0, tip: 0, paymentMethod: "wire" }).ok, false);
});

test("expense input rejects invalid payloads", () => {
  assert.equal(validateExpenseInput({ category: "Marketing", description: "Campaign", amount: 100, expenseDate: "2026-08-10" }).ok, true);
  assert.equal(validateExpenseInput({ category: "", description: "Campaign", amount: 100, expenseDate: "2026-08-10" }).ok, false);
  assert.equal(validateExpenseInput({ category: "Marketing", description: "", amount: 100, expenseDate: "2026-08-10" }).ok, false);
  assert.equal(validateExpenseInput({ category: "Marketing", description: "Campaign", amount: -100, expenseDate: "2026-08-10" }).ok, false);
  assert.equal(validateExpenseInput({ category: "Marketing", description: "Campaign", amount: 100, expenseDate: "bad-date" }).ok, false);
});

test("migration includes duplicate completion and login rate-limit protections", () => {
  const migration = readFileSync("database/migrations/001_security_integrity.sql", "utf8");
  assert.match(migration, /transactions_one_service_payment_per_appointment/);
  assert.match(migration, /login_attempts/);
  assert.match(migration, /staff_working_hours_unique_window/);
});

test("staff revenue aggregation does not fan out transactions across appointments", () => {
  const rows = mergeStaffReportingRows({
    staff: [{ id: "sophie", name: "Sophie Laurent" }],
    appointmentStats: [{ staff_id: "sophie", appointments: 2, completed: 2 }],
    transactionStats: [{ staff_id: "sophie", revenue: 150, tips: 15, transaction_count: 2 }],
  });

  assert.equal(rows[0].appointments, 2);
  assert.equal(rows[0].revenue, 150);
  assert.equal(rows[0].tips, 15);
  assert.equal(rows[0].averageTicket, 75);
});

test("migration includes database-driven salon opening hours", () => {
  const migration = readFileSync("database/migrations/002_salon_opening_hours.sql", "utf8");
  assert.match(migration, /salon_opening_hours/);
  assert.match(migration, /day_of_week integer primary key/);
});
