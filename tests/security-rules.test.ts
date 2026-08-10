import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { canTransitionAppointment, validateExpenseInput, validatePaymentInput } from "../src/lib/security-rules";

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
