import type { AppointmentStatus } from "@/lib/salon-data";

export const staffStatusTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "completed", "cancelled", "no_show"],
  in_progress: ["completed", "cancelled", "no_show"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export const blockingAppointmentStatuses = ["pending", "confirmed", "in_progress"] as const satisfies AppointmentStatus[];
export const terminalAppointmentStatuses = ["completed", "cancelled", "no_show"] as const satisfies AppointmentStatus[];

export const paymentMethods = ["cash", "card", "bancontact", "online", "other"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export function canTransitionAppointment(from: AppointmentStatus, to: AppointmentStatus) {
  return staffStatusTransitions[from]?.includes(to) ?? false;
}

export function blocksAppointmentAvailability(status: AppointmentStatus) {
  return blockingAppointmentStatuses.some((item) => item === status);
}

export function isTerminalAppointmentStatus(status: AppointmentStatus) {
  return terminalAppointmentStatuses.some((item) => item === status);
}

export function canScheduleNextAppointment(status: AppointmentStatus) {
  return ["confirmed", "in_progress", "completed", "no_show"].some((item) => item === status);
}

export function validatePaymentInput(input: { grossAmount?: unknown; amount?: unknown; discount: unknown; tip: unknown; paymentMethod: unknown }) {
  const grossAmount = Number(input.grossAmount ?? input.amount);
  const discount = Number(input.discount);
  const tip = Number(input.tip);
  const method = String(input.paymentMethod ?? "");

  if (!Number.isFinite(grossAmount) || !Number.isFinite(discount) || !Number.isFinite(tip)) {
    return { ok: false as const, error: "Payment values must be valid numbers." };
  }
  if (grossAmount < 0 || discount < 0 || tip < 0) {
    return { ok: false as const, error: "Payment values cannot be negative." };
  }
  if (discount > grossAmount) {
    return { ok: false as const, error: "Discount cannot exceed the payment amount." };
  }
  if (!paymentMethods.includes(method as PaymentMethod)) {
    return { ok: false as const, error: "Unsupported payment method." };
  }

  return { ok: true as const, grossAmount, discount, netAmount: grossAmount - discount, tip, paymentMethod: method as PaymentMethod };
}

export function validateExpenseInput(input: { category: unknown; description: unknown; amount: unknown; expenseDate: unknown; supplier?: unknown }) {
  const category = String(input.category ?? "").trim();
  const description = String(input.description ?? "").trim();
  const supplier = String(input.supplier ?? "").trim();
  const amount = Number(input.amount);
  const expenseDate = String(input.expenseDate ?? "").trim();
  const parsedDate = new Date(`${expenseDate}T00:00:00Z`);

  if (!category) return { ok: false as const, error: "Expense category is required." };
  if (!description) return { ok: false as const, error: "Expense description is required." };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false as const, error: "Expense amount must be greater than zero." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate) || Number.isNaN(parsedDate.getTime())) {
    return { ok: false as const, error: "Expense date is invalid." };
  }

  return { ok: true as const, category, description, supplier, amount, expenseDate };
}
