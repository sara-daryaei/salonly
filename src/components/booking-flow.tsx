"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, UserRound } from "lucide-react";
import { Eyebrow } from "@/components/public-shell";
import { formatDisplayDate, parseLocalDate, TODAY_BRUSSELS } from "@/lib/availability";
import { normalizeLocale, serviceText, ui } from "@/lib/i18n";
import { services, staff, type Service } from "@/lib/salon-data";

type FormErrors = Partial<Record<"firstName" | "lastName" | "email" | "phone" | "booking", string>>;
type AvailabilityDay = { date: string; available: boolean };
type TimeSlot = { time: string; staffId: string };

const weekdays = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  nl: ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"],
};

export function BookingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = normalizeLocale(searchParams.get("lang"));
  const copy = ui[locale].booking;
  const queryServiceId = searchParams.get("service");
  const queryStaffId = searchParams.get("staff");
  const initialService = services.find((item) => item.id === queryServiceId) ?? null;
  const initialStaff = initialService
    ? queryStaffId && staff.some((person) => person.id === queryStaffId && person.services.includes(initialService.id))
      ? queryStaffId
      : "any"
    : null;
  const initialMonth = parseLocalDate(TODAY_BRUSSELS);
  const [selectedService, setSelectedService] = useState<Service | null>(initialService);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(initialStaff);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));
  const [availableDays, setAvailableDays] = useState<AvailabilityDay[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [checkingDays, setCheckingDays] = useState(false);
  const [checkingSlots, setCheckingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customerFirstName, setCustomerFirstName] = useState("");
  const [customerLastName, setCustomerLastName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale === "nl" ? "nl-BE" : "en-GB", { month: "long", year: "numeric", timeZone: "Europe/Brussels" }),
    [locale],
  );

  const capableStaff = useMemo(
    () => (selectedService ? staff.filter((person) => person.services.includes(selectedService.id)) : []),
    [selectedService],
  );

  const selectedStaff = selectedProfessional && selectedProfessional !== "any"
    ? staff.find((person) => person.id === selectedProfessional) ?? null
    : null;

  useEffect(() => {
    if (!selectedService || !selectedProfessional) return;

    const controller = new AbortController();
    fetch(`/api/availability/dates?serviceId=${selectedService.id}&staffId=${selectedProfessional}&year=${currentMonth.getFullYear()}&month=${currentMonth.getMonth()}`, {
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((data) => {
        const availableDates = new Set<string>(data.availableDates ?? []);
        setAvailableDays(calendarDatesForMonth(currentMonth).map((date) => ({ date, available: availableDates.has(date) })));
      })
      .catch(() => undefined)
      .finally(() => setCheckingDays(false));

    return () => controller.abort();
  }, [selectedService, selectedProfessional, currentMonth]);

  useEffect(() => {
    if (!selectedService || !selectedProfessional || !selectedDate) return;

    const controller = new AbortController();
    fetch(`/api/availability/times?serviceId=${selectedService.id}&staffId=${selectedProfessional}&date=${selectedDate}`, {
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((data) => setAvailableSlots(data.slots ?? []))
      .catch(() => undefined)
      .finally(() => setCheckingSlots(false));

    return () => controller.abort();
  }, [selectedService, selectedProfessional, selectedDate]);

  function chooseService(service: Service) {
    setSelectedService(service);
    setSelectedProfessional("any");
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailableSlots([]);
    setAvailableDays([]);
    setCheckingDays(true);
    setErrors({});
  }

  function chooseProfessional(value: string) {
    setSelectedProfessional(value);
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailableSlots([]);
    setCheckingDays(true);
    setErrors({});
  }

  function chooseDate(date: string) {
    setSelectedDate(date);
    setSelectedTime(null);
    setCheckingSlots(true);
    setErrors({});
  }

  function changeMonth(direction: -1 | 1) {
    setCheckingDays(Boolean(selectedService && selectedProfessional));
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1));
  }

  function validateForm() {
    const nextErrors: FormErrors = {};
    if (!customerFirstName.trim()) nextErrors.firstName = copy.requiredFirstName;
    if (!customerLastName.trim()) nextErrors.lastName = copy.requiredLastName;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) nextErrors.email = copy.invalidEmail;
    if (!/^\+?[0-9][0-9\s().-]{6,}$/.test(customerPhone.trim())) nextErrors.phone = copy.invalidPhone;
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  const isComplete = Boolean(
    selectedService &&
      selectedProfessional &&
      selectedDate &&
      selectedTime &&
      customerFirstName.trim() &&
      customerLastName.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim()) &&
      /^\+?[0-9][0-9\s().-]{6,}$/.test(customerPhone.trim()),
  );

  async function submitBooking() {
    if (!validateForm() || !selectedService || !selectedProfessional || !selectedDate || !selectedTime) return;

    setSubmitting(true);
    setErrors({});
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: selectedService.id,
        staffId: selectedProfessional,
        date: selectedDate,
        startTime: selectedTime,
        firstName: customerFirstName,
        lastName: customerLastName,
        email: customerEmail,
        phone: customerPhone,
      }),
    });
    const data = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      setErrors({ booking: data.error ?? copy.bookingError });
      if (selectedService && selectedProfessional && selectedDate) {
        const refreshed = await fetch(`/api/availability/times?serviceId=${selectedService.id}&staffId=${selectedProfessional}&date=${selectedDate}`).then((res) => res.json());
        setAvailableSlots(refreshed.slots ?? []);
        setSelectedTime(null);
      }
      return;
    }

    router.push(`/book/success?reference=${encodeURIComponent(data.appointment.reference)}${locale === "nl" ? "&lang=nl" : ""}`);
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-24 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
      <div className="space-y-6">
        <Step number={1} title={copy.service}>
          <div className="grid gap-3 md:grid-cols-2">
            {services.slice(0, 8).map((service) => (
              <Choice key={service.id} active={service.id === selectedService?.id} title={serviceText(service, locale).name} meta={`${service.duration} min · €${service.price}`} onClick={() => chooseService(service)} />
            ))}
          </div>
        </Step>

        <Step number={2} title={copy.professional}>
          {!selectedService ? (
            <EmptyState>{copy.firstService}</EmptyState>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <Choice active={selectedProfessional === "any"} title={copy.noPreference} meta={copy.anyStylist} onClick={() => chooseProfessional("any")} />
              {capableStaff.map((person) => (
                <Choice
                  key={person.id}
                  active={selectedProfessional === person.id}
                  title={`${person.firstName} ${person.lastName}`}
                  meta={person.specialties[0]}
                  image={person.photo}
                  onClick={() => chooseProfessional(person.id)}
                />
              ))}
            </div>
          )}
        </Step>

        <Step number={3} title={copy.date}>
          {!selectedService ? (
            <EmptyState>{copy.firstServiceCalendar}</EmptyState>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <button className="rounded-full border border-[#34251c]/10 bg-white p-2" onClick={() => changeMonth(-1)} aria-label={copy.previousMonth}>
                  <ChevronLeft size={18} />
                </button>
                <h3 className="font-serif text-2xl">{monthFormatter.format(currentMonth)}</h3>
                <button className="rounded-full border border-[#34251c]/10 bg-white p-2" onClick={() => changeMonth(1)} aria-label={copy.nextMonth}>
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-sm">
                {weekdays[locale].map((day) => <strong key={day} className="py-2 text-[#9a7a58]">{day}</strong>)}
                {calendarCells(currentMonth, availableDays).map((cell, index) => (
                  cell.date ? (
                    <button
                      key={cell.date}
                      disabled={!cell.available || checkingDays}
                      onClick={() => chooseDate(cell.date)}
                      className={`min-h-14 rounded-2xl border py-3 text-base transition ${
                        selectedDate === cell.date
                          ? "border-[#2f2118] bg-[#2f2118] font-semibold text-white"
                          : cell.date === TODAY_BRUSSELS && cell.available && !checkingDays
                            ? "border-[#9a7a58] bg-[#fffaf4] font-semibold text-[#2f2118]"
                            : !cell.available || checkingDays
                              ? "border-transparent bg-[#eee4d8] text-[#b2a495] opacity-70"
                              : "border-[#34251c]/10 bg-[#fffaf4] text-[#68584d] hover:border-[#2f2118] hover:bg-[#f1e8db]"
                      }`}
                    >
                      {Number(cell.date.slice(-2))}
                    </button>
                  ) : <span key={`blank-${index}`} />
                ))}
              </div>
              <p className="mt-3 text-sm text-[#68584d]">{checkingDays ? copy.checking : copy.dateHint}</p>
            </>
          )}
        </Step>

        <Step number={4} title={copy.time}>
          {!selectedDate ? (
            <EmptyState>{copy.dateFirst}</EmptyState>
          ) : checkingSlots ? (
            <EmptyState>{copy.checking}</EmptyState>
          ) : availableSlots.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
              {availableSlots.map((slot) => (
                <button
                  key={`${slot.time}-${slot.staffId}`}
                  onClick={() => setSelectedTime(slot.time)}
                  className={`rounded-full border px-4 py-3 text-sm font-semibold transition ${slot.time === selectedTime ? "border-[#2f2118] bg-[#2f2118] text-white" : "border-[#34251c]/10 bg-[#fffaf4] text-[#68584d] hover:border-[#2f2118] hover:bg-[#f1e8db]"}`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          ) : (
            <EmptyState>
              {copy.noTimes}
              <button className="mt-3 block rounded-full bg-[#2f2118] px-4 py-2 text-sm font-semibold text-white" onClick={() => setSelectedDate(null)}>{copy.anotherDate}</button>
            </EmptyState>
          )}
          <p className="mt-3 text-sm text-[#68584d]">{copy.slotHint}</p>
        </Step>

        <Step number={5} title={copy.customer}>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={copy.firstName} value={customerFirstName} onChange={setCustomerFirstName} error={errors.firstName} />
            <Field label={copy.lastName} value={customerLastName} onChange={setCustomerLastName} error={errors.lastName} />
            <Field label={copy.email} value={customerEmail} onChange={setCustomerEmail} error={errors.email} />
            <Field label={copy.phone} value={customerPhone} onChange={setCustomerPhone} error={errors.phone} placeholder="+32 470 12 34 56" />
          </div>
        </Step>
      </div>

      <aside className="h-max rounded-[2rem] border border-[#34251c]/10 bg-[#fffaf4] p-6 shadow-xl shadow-[#2f2118]/10 lg:sticky lg:top-24">
        <Eyebrow>{copy.summary}</Eyebrow>
        <div className="mt-5 space-y-3 text-sm">
          <Summary label={copy.service.replace("Choose ", "").replace("Kies ", "")} value={selectedService ? serviceText(selectedService, locale).name : "-"} />
          <Summary label={copy.professional.replace("Choose ", "").replace("Kies ", "")} value={selectedProfessional === "any" ? copy.noPreference : selectedStaff ? `${selectedStaff.firstName} ${selectedStaff.lastName}` : "-"} />
          <Summary label={copy.date.replace("Choose ", "").replace("Kies ", "")} value={selectedDate ? formatDisplayDate(selectedDate) : "-"} />
          <Summary label={copy.time.replace("Choose ", "").replace("Kies ", "")} value={selectedTime ?? "-"} />
          <Summary label={copy.duration} value={selectedService ? `${selectedService.duration} min` : "-"} />
          <Summary label={copy.price} value={selectedService ? `€${selectedService.price}` : "-"} />
        </div>
        {errors.booking ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{errors.booking}</p> : null}
        <button
          disabled={!isComplete || submitting}
          onClick={submitBooking}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#2f2118] px-5 py-4 font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#b2a495]"
        >
          <CheckCircle2 size={18} /> {submitting ? copy.confirming : copy.confirm}
        </button>
      </aside>
    </section>
  );
}

function calendarCells(currentMonth: Date, availableDays: AvailabilityDay[]) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const mondayOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const availability = new Map(availableDays.map((day) => [day.date, day.available]));
  const cells: { date: string; available: boolean }[] = Array.from({ length: mondayOffset }, () => ({ date: "", available: false }));

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ date, available: date >= TODAY_BRUSSELS && Boolean(availability.get(date)) });
  }

  return cells;
}

function calendarDatesForMonth(currentMonth: Date) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => `${year}-${String(month + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`);
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return <section className="rounded-[2rem] border border-[#34251c]/10 bg-[#fffaf4] p-6"><h2 className="mb-5 flex items-center gap-3 font-serif text-3xl"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#2f2118] text-sm text-white">{number}</span>{title}</h2>{children}</section>;
}

function Choice({ title, meta, active, image, onClick }: { title: string; meta: string; active?: boolean; image?: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${active ? "border-[#2f2118] bg-[#f1e8db]" : "border-[#34251c]/10 bg-white"}`}>{image ? <span className="h-12 w-12 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} /> : <UserRound size={24} />}<span><strong className="block">{title}</strong><span className="flex items-center gap-1 text-sm text-[#68584d]"><Clock size={14} /> {meta}</span></span></button>;
}

function Field({ label, value, onChange, error, placeholder }: { label: string; value: string; onChange: (value: string) => void; error?: string; placeholder?: string }) {
  return <label><input className={`w-full rounded-2xl border bg-white px-4 py-3 ${error ? "border-red-400" : "border-[#34251c]/10"}`} placeholder={placeholder ?? label} value={value} onChange={(event) => onChange(event.target.value)} />{error ? <span className="mt-1 block text-xs font-semibold text-red-700">{error}</span> : null}</label>;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-[#34251c]/20 bg-white/60 p-5 text-sm text-[#68584d]">{children}</div>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 border-b border-[#34251c]/10 py-3"><span className="text-[#68584d]">{label}</span><strong className="text-right">{value}</strong></div>;
}
