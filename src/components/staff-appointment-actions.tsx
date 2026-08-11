"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, PlayCircle, XCircle } from "lucide-react";
import type { InternalAppointmentRecord } from "@/lib/internal/appointments";
import { canScheduleNextAppointment, canTransitionAppointment, isTerminalAppointmentStatus, paymentMethods } from "@/lib/security-rules";

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
  const [standaloneProductId, setStandaloneProductId] = useState("");
  const [standaloneQuantity, setStandaloneQuantity] = useState(1);
  const [standalonePaymentMethod, setStandalonePaymentMethod] = useState("");
  const [nextServiceId, setNextServiceId] = useState(String(appointment.serviceId));
  const [nextDate, setNextDate] = useState("");
  const [nextSlots, setNextSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const terminal = isTerminalAppointmentStatus(appointment.status);
  const canScheduleNext = canScheduleNextAppointment(appointment.status);
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

  async function sellStandaloneProduct() {
    const ok = await post(`/api/staff/appointments/${appointment.appointmentId}/product-sales`, {
      productId: standaloneProductId,
      quantity: standaloneQuantity,
      paymentMethod: standalonePaymentMethod,
    }, "Product sale recorded.");
    if (ok) {
      setStandaloneProductId("");
      setStandaloneQuantity(1);
      setStandalonePaymentMethod("");
    }
  }

  useEffect(() => {
    let cancelled = false;
    if (!nextServiceId || !nextDate) return;
    Promise.resolve()
      .then(() => {
        if (cancelled) return;
        setNextSlots([]);
        setSlotsError("");
        setSlotsLoading(true);
      })
      .then(() => fetch(`/api/availability/times?serviceId=${encodeURIComponent(nextServiceId)}&staffId=${encodeURIComponent(appointment.staffId)}&date=${encodeURIComponent(nextDate)}`, {
        cache: "no-store",
      }))
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Could not load available times.")))
      .then((payload) => {
        if (!cancelled) setNextSlots(Array.isArray(payload.slots) ? payload.slots.map((slot: { time: string }) => slot.time) : []);
      })
      .catch((err) => {
        if (!cancelled) setSlotsError(err instanceof Error ? err.message : "Could not load available times.");
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appointment.staffId, nextDate, nextServiceId]);

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
          <p className="text-xs font-semibold text-[#64736d]">Products included here use the same payment method as the completed appointment.</p>
          <textarea name="note" placeholder="Completion note" className={inputClass} />
          <button disabled={busy} className={buttonClass}><CheckCircle2 size={16} /> Complete</button>
        </form>
      ) : null}

      {!terminal && products.length ? (
        <div className="space-y-2 rounded-xl border border-black/10 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6b7772]">Standalone product sale</p>
          <div className="grid gap-2 md:grid-cols-[1fr_90px_150px]">
            <select value={standaloneProductId} onChange={(event) => setStandaloneProductId(event.target.value)} className={inputClass}>
              <option value="">Select product</option>
              {products.map((product) => <option key={String(product.id)} value={String(product.id)}>{String(product.name)} · stock {String(product.stock_quantity)}</option>)}
            </select>
            <input value={standaloneQuantity} onChange={(event) => setStandaloneQuantity(Number(event.target.value))} type="number" min={1} className={inputClass} />
            <select value={standalonePaymentMethod} onChange={(event) => setStandalonePaymentMethod(event.target.value)} className={inputClass}>
              <option value="">Payment</option>
              {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
          </div>
          <button type="button" disabled={busy || !standaloneProductId || !standalonePaymentMethod} onClick={sellStandaloneProduct} className={buttonClass}>Record product sale</button>
        </div>
      ) : null}

      {canScheduleNext && services.length ? (
        <form action={scheduleNext} className="space-y-2 rounded-xl border border-black/10 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6b7772]">Schedule next appointment</p>
          <div className="grid gap-2 md:grid-cols-3">
            <select name="serviceId" value={nextServiceId} onChange={(event) => setNextServiceId(event.target.value)} className={inputClass}>
              {services.map((service) => <option key={String(service.id)} value={String(service.id)}>{String(service.name)}</option>)}
            </select>
            <input name="date" type="date" required value={nextDate} onChange={(event) => setNextDate(event.target.value)} className={inputClass} />
            <select name="startTime" required disabled={!nextDate || slotsLoading || !nextSlots.length} className={inputClass}>
              <option value="">{slotsLoading ? "Loading..." : "Select time"}</option>
              {nextSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
            </select>
          </div>
          {nextDate && !slotsLoading && !nextSlots.length ? <p className="text-sm font-semibold text-[#64736d]">No available times for this date.</p> : null}
          {slotsError ? <p className="text-sm font-semibold text-[#9c3d28]">{slotsError}</p> : null}
          <textarea name="notes" placeholder="Next appointment note" className={inputClass} />
          <button disabled={busy || slotsLoading || !nextSlots.length} className={buttonClass}>Schedule next</button>
        </form>
      ) : null}

      {message ? <p className="rounded-xl bg-[#eef4ef] px-3 py-2 text-sm font-semibold text-[#173d35]">{message}</p> : null}
      {error ? <p className="rounded-xl bg-[#fff2ee] px-3 py-2 text-sm font-semibold text-[#9c3d28]">{error}</p> : null}
    </div>
  );
}

const inputClass = "w-full rounded-xl border border-black/10 px-3 py-2 text-sm";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-2 text-sm font-bold disabled:opacity-50";
