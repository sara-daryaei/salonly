"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, PlayCircle, XCircle } from "lucide-react";
import type { InternalAppointmentRecord } from "@/lib/internal/appointments";
import { canTransitionAppointment, paymentMethods } from "@/lib/security-rules";

export function StaffAppointmentActions({
  appointment,
  products,
  services,
}: {
  appointment: InternalAppointmentRecord;
  products: Record<string, unknown>[];
  services: Record<string, unknown>[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const terminal = ["completed", "cancelled", "no_show"].includes(appointment.status);
  const canStart = canTransitionAppointment(appointment.status, "in_progress");
  const canComplete = canTransitionAppointment(appointment.status, "completed");
  const canCancel = canTransitionAppointment(appointment.status, "cancelled");
  const canNoShow = canTransitionAppointment(appointment.status, "no_show");

  async function post(path: string, body: Record<string, unknown>, success: string) {
    setBusy(true);
    setMessage("");
    setError("");
    const response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setError(payload?.error ?? "Action failed.");
      return false;
    }
    setMessage(success);
    router.refresh();
    return true;
  }

  async function complete(formData: FormData) {
    await post(`/api/staff/appointments/${appointment.appointmentId}/complete`, {
      grossAmount: Number(formData.get("grossAmount")),
      discount: Number(formData.get("discount")),
      tip: Number(formData.get("tip")),
      paymentMethod: formData.get("paymentMethod"),
      note: formData.get("note"),
      products: productId ? [{ productId, quantity }] : [],
    }, "Appointment completed.");
  }

  async function addNote(formData: FormData) {
    await post(`/api/staff/appointments/${appointment.appointmentId}/notes`, {
      note: formData.get("note"),
      customerNote: formData.get("customerNote") === "on",
    }, "Note saved.");
  }

  async function scheduleNext(formData: FormData) {
    await post(`/api/staff/customers/${appointment.customerId}/appointments`, {
      serviceId: formData.get("serviceId"),
      date: formData.get("date"),
      startTime: formData.get("startTime"),
      notes: formData.get("notes"),
    }, "Next appointment scheduled.");
  }

  return (
    <div className="space-y-4">
      {!terminal ? (
        <div className="grid gap-2 md:grid-cols-3">
          <button disabled={busy || !canStart} onClick={() => post(`/api/staff/appointments/${appointment.appointmentId}/start`, {}, "Appointment started.")} className={buttonClass}><PlayCircle size={16} /> Start</button>
          <button disabled={busy || !canNoShow} onClick={() => post(`/api/staff/appointments/${appointment.appointmentId}/status`, { status: "no_show" }, "Marked no-show.")} className={buttonClass}><XCircle size={16} /> No show</button>
          <button disabled={busy || !canCancel} onClick={() => post(`/api/staff/appointments/${appointment.appointmentId}/status`, { status: "cancelled" }, "Appointment cancelled.")} className={buttonClass}>Cancel</button>
        </div>
      ) : null}

      {!terminal ? (
        <form action={addNote} className="space-y-2 rounded-xl border border-black/10 p-3">
          <textarea name="note" required placeholder="Add note" className={inputClass} />
          <label className="flex items-center gap-2 text-xs font-bold"><input name="customerNote" type="checkbox" /> Save as customer note</label>
          <button disabled={busy} className={buttonClass}>Add note</button>
        </form>
      ) : null}

      {canComplete ? (
        <form action={complete} className="space-y-2 rounded-xl border border-black/10 p-3">
          <div className="grid gap-2 md:grid-cols-4">
            <input name="grossAmount" type="number" step="0.01" defaultValue={appointment.price} className={inputClass} />
            <input name="discount" type="number" step="0.01" defaultValue={0} className={inputClass} />
            <input name="tip" type="number" step="0.01" defaultValue={0} className={inputClass} />
            <select name="paymentMethod" defaultValue="card" className={inputClass}>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select>
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_120px]">
            <select value={productId} onChange={(event) => setProductId(event.target.value)} className={inputClass}>
              <option value="">No product</option>
              {products.map((product) => <option key={String(product.id)} value={String(product.id)}>{String(product.name)} · stock {String(product.stock_quantity)}</option>)}
            </select>
            <input value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} type="number" min={1} className={inputClass} />
          </div>
          <textarea name="note" placeholder="Completion note" className={inputClass} />
          <button disabled={busy} className={buttonClass}><CheckCircle2 size={16} /> Complete</button>
        </form>
      ) : null}

      {!terminal && services.length ? (
        <form action={scheduleNext} className="space-y-2 rounded-xl border border-black/10 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6b7772]">Schedule next appointment</p>
          <div className="grid gap-2 md:grid-cols-3">
            <select name="serviceId" defaultValue={appointment.serviceId} className={inputClass}>
              {services.map((service) => <option key={String(service.id)} value={String(service.id)}>{String(service.name)}</option>)}
            </select>
            <input name="date" type="date" required className={inputClass} />
            <input name="startTime" type="time" required className={inputClass} />
          </div>
          <textarea name="notes" placeholder="Next appointment note" className={inputClass} />
          <button disabled={busy} className={buttonClass}>Schedule next</button>
        </form>
      ) : null}

      {message ? <p className="rounded-xl bg-[#eef4ef] px-3 py-2 text-sm font-semibold text-[#173d35]">{message}</p> : null}
      {error ? <p className="rounded-xl bg-[#fff2ee] px-3 py-2 text-sm font-semibold text-[#9c3d28]">{error}</p> : null}
    </div>
  );
}

const inputClass = "w-full rounded-xl border border-black/10 px-3 py-2 text-sm";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-2 text-sm font-bold disabled:opacity-50";
