"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Save, Trash2 } from "lucide-react";

type FieldValue = string | number | boolean | string[] | Record<string, unknown>[];

export function ActionForm({
  endpoint,
  method = "PATCH",
  submitLabel = "Save",
  children,
  transform,
}: {
  endpoint: string;
  method?: "POST" | "PATCH" | "PUT" | "DELETE";
  submitLabel?: string;
  children: React.ReactNode;
  transform: (formData: FormData) => Record<string, FieldValue>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    setMessage("");
    const response = await fetch(endpoint, {
      method,
      headers: { "content-type": "application/json" },
      body: method === "DELETE" ? undefined : JSON.stringify(transform(formData)),
    });
    const payload = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setMessage(payload?.error ?? "Action failed.");
      return;
    }
    setMessage("Saved.");
    router.refresh();
  }

  return (
    <form action={submit} className="space-y-3">
      {children}
      <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#173d35] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
        <Save size={15} /> {busy ? "Saving..." : submitLabel}
      </button>
      {message ? <p className="rounded-xl bg-[#eef4ef] px-3 py-2 text-sm font-semibold text-[#173d35]">{message}</p> : null}
    </form>
  );
}

export function AppointmentEditor({
  appointment,
  staff,
  services,
}: {
  appointment: Record<string, unknown>;
  staff: Record<string, unknown>[];
  services: Record<string, unknown>[];
}) {
  const start = new Date(String(appointment.start_at));
  const date = start.toISOString().slice(0, 10);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Brussels", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(start);
  return (
    <ActionForm
      endpoint={`/api/admin/appointments/${appointment.id}`}
      submitLabel="Update appointment"
      transform={(fd) => ({
        status: String(fd.get("status")),
        staffId: String(fd.get("staffId")),
        serviceId: String(fd.get("serviceId")),
        date: String(fd.get("date")),
        time: String(fd.get("time")),
        notes: String(fd.get("notes")),
      })}
    >
      <div className="grid gap-2 md:grid-cols-3">
        <select name="status" defaultValue={String(appointment.status)} className={inputClass}>
          {["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select name="staffId" defaultValue={String(appointment.staff_id)} className={inputClass}>
          {staff.map((person) => <option key={String(person.id)} value={String(person.id)}>{String(person.firstName ?? person.first_name)} {String(person.lastName ?? person.last_name)}</option>)}
        </select>
        <select name="serviceId" defaultValue={String(appointment.service_id)} className={inputClass}>
          {services.map((service) => <option key={String(service.id)} value={String(service.id)}>{String(service.name)}</option>)}
        </select>
        <input name="date" type="date" defaultValue={date} className={inputClass} />
        <input name="time" type="time" defaultValue={time} className={inputClass} />
      </div>
      <textarea name="notes" defaultValue={String(appointment.notes ?? "")} className={inputClass} placeholder="Internal notes" />
    </ActionForm>
  );
}

export function CustomerNoteForm({ customerId }: { customerId: string }) {
  return (
    <ActionForm endpoint={`/api/admin/customers/${customerId}/notes`} method="POST" submitLabel="Add note" transform={(fd) => ({ note: String(fd.get("note")) })}>
      <textarea name="note" className={inputClass} placeholder="Manager note for this customer" />
    </ActionForm>
  );
}

export function StaffEditor({ person, services }: { person?: Record<string, unknown>; services: Record<string, unknown>[] }) {
  const serviceIds = new Set(Array.isArray(person?.service_ids) ? person?.service_ids.map(String) : []);
  return (
    <ActionForm
      endpoint={person ? `/api/admin/staff/${person.id}` : "/api/admin/staff"}
      method={person ? "PATCH" : "POST"}
      submitLabel={person ? "Save employee" : "Create employee"}
      transform={(fd) => ({ firstName: fd.get("firstName") as string, lastName: fd.get("lastName") as string, jobTitle: fd.get("jobTitle") as string, email: fd.get("email") as string, phone: fd.get("phone") as string, bio: fd.get("bio") as string, active: fd.get("active") === "on", serviceIds: fd.getAll("serviceIds").map(String) })}
    >
      <div className="grid gap-2 md:grid-cols-3">
        <input name="firstName" defaultValue={String(person?.first_name ?? "")} placeholder="First name" className={inputClass} />
        <input name="lastName" defaultValue={String(person?.last_name ?? "")} placeholder="Last name" className={inputClass} />
        <input name="jobTitle" defaultValue={String(person?.job_title ?? "")} placeholder="Job title" className={inputClass} />
        <input name="email" defaultValue={String(person?.email ?? "")} placeholder="Email" className={inputClass} />
        <input name="phone" defaultValue={String(person?.phone ?? "")} placeholder="Phone" className={inputClass} />
        <label className="flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-sm"><input name="active" type="checkbox" defaultChecked={person ? Boolean(person.active) : true} /> Active</label>
      </div>
      <textarea name="bio" defaultValue={String(person?.bio ?? "")} className={inputClass} placeholder="Bio" />
      <div className="grid gap-2 md:grid-cols-3">
        {services.map((service) => <label key={String(service.id)} className="flex items-center gap-2 text-sm"><input name="serviceIds" value={String(service.id)} type="checkbox" defaultChecked={serviceIds.has(String(service.id))} /> {String(service.name)}</label>)}
      </div>
    </ActionForm>
  );
}

export function ScheduleEditor({ staffId }: { staffId: string }) {
  return (
    <ActionForm
      endpoint={`/api/admin/staff/${staffId}/schedule`}
      method="PUT"
      submitLabel="Replace weekly schedule"
      transform={(fd) => ({ schedules: String(fd.get("schedules")).split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
        const [day, start, end, lunchStart, lunchEnd] = line.split(",").map((part) => part.trim());
        return { day, start, end, lunchStart, lunchEnd, active: true };
      }) })}
    >
      <textarea name="schedules" className={inputClass} placeholder={"2,09:00,17:00,12:30,13:00\n3,10:00,18:00,13:00,13:30"} />
    </ActionForm>
  );
}

export function TimeOffEditor({ staffId }: { staffId: string }) {
  return (
    <ActionForm endpoint={`/api/admin/staff/${staffId}/time-off`} method="POST" submitLabel="Add time off" transform={(fd) => ({ date: fd.get("date") as string, start: fd.get("start") as string, end: fd.get("end") as string, reason: fd.get("reason") as string })}>
      <div className="grid gap-2 md:grid-cols-4"><input name="date" type="date" className={inputClass} /><input name="start" type="time" className={inputClass} /><input name="end" type="time" className={inputClass} /><input name="reason" placeholder="Reason" className={inputClass} /></div>
    </ActionForm>
  );
}

export function ServiceEditor({ service, staff }: { service?: Record<string, unknown>; staff: Record<string, unknown>[] }) {
  const staffIds = new Set(Array.isArray(service?.staff_ids) ? service?.staff_ids.map(String) : []);
  return (
    <ActionForm
      endpoint={service ? `/api/admin/services/${service.id}` : "/api/admin/services"}
      method={service ? "PATCH" : "POST"}
      submitLabel={service ? "Save service" : "Create service"}
      transform={(fd) => ({ name: fd.get("name") as string, category: fd.get("category") as string, description: fd.get("description") as string, price: Number(fd.get("price")), duration: Number(fd.get("duration")), imageUrl: fd.get("imageUrl") as string, active: fd.get("active") === "on", staffIds: fd.getAll("staffIds").map(String) })}
    >
      <div className="grid gap-2 md:grid-cols-3">
        <input name="name" defaultValue={String(service?.name ?? "")} placeholder="Name" className={inputClass} />
        <input name="category" defaultValue={String(service?.category ?? "")} placeholder="Category" className={inputClass} />
        <input name="price" type="number" defaultValue={String(service?.price ?? 0)} placeholder="Price" className={inputClass} />
        <input name="duration" type="number" defaultValue={String(service?.duration ?? 30)} placeholder="Duration" className={inputClass} />
        <input name="imageUrl" defaultValue={String(service?.image_url ?? "")} placeholder="Image URL" className={inputClass} />
        <label className="flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-sm"><input name="active" type="checkbox" defaultChecked={service ? Boolean(service.active) : true} /> Bookable</label>
      </div>
      <textarea name="description" defaultValue={String(service?.description ?? "")} className={inputClass} placeholder="Description" />
      <div className="grid gap-2 md:grid-cols-3">{staff.map((person) => <label key={String(person.id)} className="flex items-center gap-2 text-sm"><input name="staffIds" value={String(person.id)} type="checkbox" defaultChecked={staffIds.has(String(person.id))} /> {String(person.firstName ?? person.first_name)} {String(person.lastName ?? person.last_name)}</label>)}</div>
    </ActionForm>
  );
}

export function ProductEditor({ product }: { product?: Record<string, unknown> }) {
  return (
    <ActionForm
      endpoint={product ? `/api/admin/products/${product.id}` : "/api/admin/products"}
      method={product ? "PATCH" : "POST"}
      submitLabel={product ? "Save product" : "Create product"}
      transform={(fd) => ({ name: fd.get("name") as string, sku: fd.get("sku") as string, costPrice: Number(fd.get("costPrice")), salePrice: Number(fd.get("salePrice")), stock: Number(fd.get("stock")), active: fd.get("active") === "on" })}
    >
      <div className="grid gap-2 md:grid-cols-3">
        <input name="name" defaultValue={String(product?.name ?? "")} placeholder="Name" className={inputClass} />
        <input name="sku" defaultValue={String(product?.sku ?? "")} placeholder="SKU" className={inputClass} />
        <input name="costPrice" type="number" step="0.01" defaultValue={String(product?.cost_price ?? 0)} placeholder="Cost" className={inputClass} />
        <input name="salePrice" type="number" step="0.01" defaultValue={String(product?.sale_price ?? 0)} placeholder="Sale" className={inputClass} />
        <input name="stock" type="number" defaultValue={String(product?.stock_quantity ?? 0)} placeholder="Stock" className={inputClass} />
        <label className="flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-sm"><input name="active" type="checkbox" defaultChecked={product ? Boolean(product.active) : true} /> Active</label>
      </div>
    </ActionForm>
  );
}

export function StockAdjuster({ productId }: { productId: string }) {
  return (
    <ActionForm endpoint={`/api/admin/products/${productId}/adjust`} method="POST" submitLabel="Adjust stock" transform={(fd) => ({ delta: Number(fd.get("delta")), reason: fd.get("reason") as string })}>
      <div className="grid gap-2 md:grid-cols-[120px_1fr]"><input name="delta" type="number" placeholder="+/-" className={inputClass} /><input name="reason" placeholder="Reason" className={inputClass} /></div>
    </ActionForm>
  );
}

export function ExpenseEditor({ expense }: { expense: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      <ActionForm endpoint={`/api/admin/expenses/${expense.id}`} submitLabel="Save expense" transform={(fd) => ({ category: fd.get("category") as string, description: fd.get("description") as string, supplier: fd.get("supplier") as string, amount: Number(fd.get("amount")), expenseDate: fd.get("expenseDate") as string })}>
        <div className="grid gap-2 md:grid-cols-5">
          <input name="category" defaultValue={String(expense.category)} className={inputClass} />
          <input name="description" defaultValue={String(expense.description)} className={inputClass} />
          <input name="supplier" defaultValue={String(expense.supplier ?? "")} className={inputClass} />
          <input name="amount" type="number" step="0.01" defaultValue={String(expense.amount)} className={inputClass} />
          <input name="expenseDate" type="date" defaultValue={String(expense.expense_date).slice(0, 10)} className={inputClass} />
        </div>
      </ActionForm>
      <ActionForm endpoint={`/api/admin/expenses/${expense.id}`} method="DELETE" submitLabel="Delete with audit" transform={() => ({})}>
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#8b3f32]"><Trash2 size={14} /> Deletes the row and writes expense_audit plus audit_logs.</span>
      </ActionForm>
    </div>
  );
}

export function AccountEditor({ account }: { account: Record<string, unknown> }) {
  return (
    <ActionForm endpoint={`/api/admin/accounts/${account.id}`} submitLabel="Update account" transform={(fd) => ({ role: fd.get("role") as string, active: fd.get("active") === "on" })}>
      <div className="grid gap-2 md:grid-cols-[1fr_140px_120px]">
        <p className="text-sm font-semibold">{String(account.email)}</p>
        <select name="role" defaultValue={String(account.role)} className={inputClass}><option value="manager">manager</option><option value="admin">admin</option></select>
        <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={Boolean(account.active)} /> Active</label>
      </div>
    </ActionForm>
  );
}

export function SettingsEditor({ settings, hours }: { settings: Record<string, unknown>; hours: Record<string, unknown>[] }) {
  return (
    <ActionForm
      endpoint="/api/admin/settings"
      submitLabel="Save settings"
      transform={(fd) => ({
        salonName: fd.get("salonName") as string,
        address: fd.get("address") as string,
        phone: fd.get("phone") as string,
        email: fd.get("email") as string,
        bookingNotice: Number(fd.get("bookingNotice")),
        maximumBookingPeriod: Number(fd.get("maximumBookingPeriod")),
        cancellationDeadline: Number(fd.get("cancellationDeadline")),
        slotInterval: Number(fd.get("slotInterval")),
        openingHours: hours.map((hour) => {
          const day = String(hour.day_of_week);
          return { day, active: fd.get(`active-${day}`) === "on", open: fd.get(`open-${day}`), close: fd.get(`close-${day}`) };
        }),
      })}
    >
      <div className="grid gap-2 md:grid-cols-2">
        <input name="salonName" defaultValue={String(settings.salon_name ?? "")} className={inputClass} />
        <input name="email" defaultValue={String(settings.email ?? "")} className={inputClass} />
        <input name="phone" defaultValue={String(settings.phone ?? "")} className={inputClass} />
        <input name="address" defaultValue={String(settings.address ?? "")} className={inputClass} />
        <input name="bookingNotice" type="number" defaultValue={String(settings.minimum_booking_notice_minutes ?? 120)} className={inputClass} />
        <input name="maximumBookingPeriod" type="number" defaultValue={String(settings.maximum_booking_period_days ?? 90)} className={inputClass} />
        <input name="cancellationDeadline" type="number" defaultValue={String(settings.cancellation_deadline_hours ?? 24)} className={inputClass} />
        <input name="slotInterval" type="number" defaultValue={String(settings.appointment_slot_interval_minutes ?? 30)} className={inputClass} />
      </div>
      <div className="grid gap-2">
        {hours.map((hour) => {
          const day = String(hour.day_of_week);
          return <div key={day} className="grid gap-2 rounded-xl border border-black/10 p-3 md:grid-cols-[120px_90px_1fr_1fr]"><strong>{dayName(Number(day))}</strong><label className="flex items-center gap-2 text-sm"><input name={`active-${day}`} type="checkbox" defaultChecked={Boolean(hour.active)} /> Open</label><input name={`open-${day}`} type="time" defaultValue={String(hour.open_time ?? "").slice(0, 5)} className={inputClass} /><input name={`close-${day}`} type="time" defaultValue={String(hour.close_time ?? "").slice(0, 5)} className={inputClass} /></div>;
        })}
      </div>
    </ActionForm>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-black/15 p-4 text-sm font-semibold text-[#64736d]">{children}</p>;
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-black/10 bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6b7772]">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}

export function BoolIcon({ value }: { value: boolean }) {
  return value ? <Check size={16} className="text-[#173d35]" /> : <Minus size={16} className="text-[#9b7a67]" />;
}

function dayName(day: number) {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day] ?? String(day);
}

const inputClass = "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#173d35]";
