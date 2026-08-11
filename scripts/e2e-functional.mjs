import { readFile } from "node:fs/promises";
import { execFileSync, spawn } from "node:child_process";
import postgres from "postgres";
import bcrypt from "bcryptjs";

const rootUrl = process.env.E2E_DATABASE_URL;
if (!rootUrl) {
  console.error("E2E_DATABASE_URL is required. Refusing to fall back to production credentials.");
  process.exit(1);
}

const port = Number(process.env.E2E_PORT ?? 3199);
const baseUrl = `http://127.0.0.1:${port}`;
const schema = `e2e_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
const rootSql = postgres(rootUrl, { ssl: "require", max: 1 });
const appUrl = withSearchPath(rootUrl, schema);
const sql = postgres(appUrl, { ssl: "require", max: 4 });
const results = [];
let server;
let serverOutput = "";

async function runChecks() {
  const targetDate = nextWeekdayDate(3, 7);
  const settingsDate = nextWeekdayDate(3, 14);
  const farDate = addDays(brusselsDate(new Date()), 91);
  const financialDate = brusselsDate(new Date());
  const originalSlot = "09:00";
  const rescheduledSlot = "14:00";
  const serviceId = "women-cut";
  const staffId = "sophie";

  await verifyMigrationSchema();

  const beforeSlots = await getSlots(serviceId, staffId, targetDate);
  assert("Initial public availability includes target slot", beforeSlots.some((slot) => slot.time === originalSlot), beforeSlots.map((slot) => slot.time).join(", "));

  const pendingAppointmentId = await createDirectAppointment({ date: targetDate, startTime: "16:00", endTime: "17:00", status: "pending", customerEmail: "pending@example.com" });
  const pendingComplete = await request(`/api/staff/appointments/${pendingAppointmentId}/complete`, {
    method: "POST",
    jar: await login("staff@maisonelegance.be", "staff123"),
    json: { grossAmount: 55, discount: 0, tip: 0, paymentMethod: "card", note: "", products: [] },
  });
  assert("pending cannot complete directly", pendingComplete.status === 409 || pendingComplete.status === 400, `status=${pendingComplete.status}`);
  await sql`update appointments set status = 'cancelled' where id = ${pendingAppointmentId}`;

  const booking = await request("/api/bookings", {
    method: "POST",
    json: {
      serviceId,
      staffId,
      date: targetDate,
      startTime: originalSlot,
      firstName: "E2E",
      lastName: "Client",
      email: "e2e.client@example.com",
      phone: "+32 470 12 34 56",
    },
  });
  const appointment = booking.body.appointment;
  assert("1. Public booking creates exactly one appointment", booking.status === 201 && appointment?.reference, JSON.stringify(booking.body));
  const countRows = await sql`select count(*)::int as count from appointments where booking_reference = ${appointment.reference}`;
  assert("1a. PostgreSQL has exactly one appointment row", Number(countRows[0].count) === 1, `count=${countRows[0].count}`);

  const afterSlots = await getSlots(serviceId, staffId, targetDate);
  assert("2. Booked slot disappears from public availability", !afterSlots.some((slot) => slot.time === originalSlot), afterSlots.map((slot) => slot.time).join(", "));

  const staffJar = await login("staff@maisonelegance.be", "staff123");
  const otherStaffJar = await login("julien@maisonelegance.be", "staff123");
  const adminJar = await login("admin@maisonelegance.be", "admin123");

  const staffPage = await request("/staff", { jar: staffJar, raw: true });
  assert("3. Assigned staff sees the appointment", staffPage.status === 200 && staffPage.text.includes("E2E Client"), `status=${staffPage.status}`);

  const otherStart = await request(`/api/staff/appointments/${appointment.id}/start`, { method: "POST", jar: otherStaffJar, json: {} });
  assert("4. Other staff cannot mutate it", otherStart.status === 403 || otherStart.status === 400, `status=${otherStart.status}`);

  const staffAdmin = await request("/admin", { jar: staffJar, redirect: "manual", raw: true });
  assert("19. Staff cannot access /admin", staffAdmin.status === 307 || staffAdmin.status === 302, `status=${staffAdmin.status}`);
  const staffAdminApi = await request("/api/admin/products", { method: "POST", jar: staffJar, json: {} });
  assert("19a. Staff cannot access admin APIs", staffAdminApi.status === 401 || staffAdminApi.status === 403, `status=${staffAdminApi.status}`);

  const start = await request(`/api/staff/appointments/${appointment.id}/start`, { method: "POST", jar: staffJar, json: {} });
  assert("5. Staff can start the appointment", start.status === 200, JSON.stringify(start.body));

  const inProgressBlockId = await createDirectAppointment({ date: settingsDate, startTime: "14:00", endTime: "15:00", status: "in_progress", customerEmail: "in-progress@example.com" });
  const slotsWithInProgress = await getSlots(serviceId, staffId, settingsDate);
  assert("in_progress blocks availability", !slotsWithInProgress.some((slot) => slot.time === "14:00" || slot.time === "14:30"), slotsWithInProgress.map((slot) => slot.time).join(", "));
  await sql`update appointments set status = 'cancelled' where id = ${inProgressBlockId}`;

  await sql`insert into staff_time_off (staff_id, starts_at, ends_at, reason) values (${staffId}, ${brusselsDateTime(settingsDate, "15:00").toISOString()}, ${brusselsDateTime(settingsDate, "16:00").toISOString()}, 'E2E partial time off')`;
  const slotsWithPartialTimeOff = await getSlots(serviceId, staffId, settingsDate);
  assert("partial time off blocks only its time range", slotsWithPartialTimeOff.some((slot) => slot.time === "14:00") && !slotsWithPartialTimeOff.some((slot) => slot.time === "15:00" || slot.time === "15:30") && slotsWithPartialTimeOff.some((slot) => slot.time === "16:00"), slotsWithPartialTimeOff.map((slot) => slot.time).join(", "));
  await sql`delete from staff_time_off where staff_id = ${staffId} and reason = 'E2E partial time off'`;

  await sql`update salon_settings set appointment_slot_interval_minutes = 15 where id = 'maison-elegance'`;
  const fifteenMinuteSlots = await getSlots(serviceId, staffId, settingsDate);
  assert("slot interval setting changes generated slots", fifteenMinuteSlots.some((slot) => slot.time === "09:15" || slot.time === "09:45"), fifteenMinuteSlots.map((slot) => slot.time).join(", "));

  const noticeMinutes = Math.ceil((brusselsDateTime(settingsDate, "09:00").getTime() - Date.now()) / 60000) + 30;
  await sql`update salon_settings set minimum_booking_notice_minutes = ${noticeMinutes}, appointment_slot_interval_minutes = 30 where id = 'maison-elegance'`;
  const slotsWithNotice = await getSlots(serviceId, staffId, settingsDate);
  assert("minimum booking notice works", !slotsWithNotice.some((slot) => slot.time === "09:00"), slotsWithNotice.map((slot) => slot.time).join(", "));

  await sql`update salon_settings set minimum_booking_notice_minutes = 120, maximum_booking_period_days = 30 where id = 'maison-elegance'`;
  const slotsBeyondMaximum = await getSlots(serviceId, staffId, farDate);
  assert("maximum booking period works", slotsBeyondMaximum.length === 0, slotsBeyondMaximum.map((slot) => slot.time).join(", "));
  await sql`update salon_settings set minimum_booking_notice_minutes = 120, maximum_booking_period_days = 90, appointment_slot_interval_minutes = 30 where id = 'maison-elegance'`;

  const repeatOne = await request("/api/bookings", {
    method: "POST",
    json: { serviceId, staffId, date: settingsDate, startTime: "10:30", firstName: "Repeat", lastName: "Client", email: "customer@example.com", phone: "+32 470 44 55 66" },
  });
  const repeatTwo = await request("/api/bookings", {
    method: "POST",
    json: { serviceId, staffId, date: settingsDate, startTime: "16:00", firstName: "Repeat", lastName: "Client", email: "Customer@Example.com", phone: "+32 470 44 55 66" },
  });
  const repeatRows = await sql`
    select c.id::text as customer_id, count(a.id)::int as appointments
    from customers c
    join appointments a on a.customer_id = c.id
    where lower(trim(c.email)) = 'customer@example.com'
    group by c.id
  `;
  assert("repeat public booking reuses customer", repeatOne.status === 201 && repeatTwo.status === 201 && repeatRows.length === 1 && Number(repeatRows[0].appointments) === 2, JSON.stringify(repeatRows));
  const repeatHistory = await sql`select count(*)::int as count from appointments where customer_id = ${repeatRows[0]?.customer_id}`;
  assert("customer history contains both appointments", Number(repeatHistory[0].count) === 2, `count=${repeatHistory[0].count}`);
  const returningRows = await sql`
    select count(*)::int as returning_customers
    from (
      select customer_id, count(*) as visits
      from appointments
      where start_at < ((${settingsDate}::date + interval '1 day') at time zone 'Europe/Brussels')
      group by customer_id
    ) visits
    where visits > 1
  `;
  assert("returning customer analytics works", Number(returningRows[0].returning_customers) >= 1, `returning=${returningRows[0].returning_customers}`);

  await verifyCustomerIdentityConflictsAndRaces({ serviceId, staffId, date: settingsDate });

  const note = await request(`/api/staff/appointments/${appointment.id}/notes`, { method: "POST", jar: staffJar, json: { note: "E2E customer prefers quiet appointment.", customerNote: true } });
  const noteRows = await sql`select count(*)::int as count from customer_notes`;
  assert("6. Staff can add customer notes", note.status === 200 && Number(noteRows[0].count) === 1, `status=${note.status} notes=${noteRows[0].count}`);

  const productBefore = await sql`select id::text, stock_quantity from products where sku = 'E2E-SHAMPOO'`;
  const productId = productBefore[0].id;
  const complete = await request(`/api/staff/appointments/${appointment.id}/complete`, {
    method: "POST",
    jar: staffJar,
    json: { grossAmount: 55, discount: 5, tip: 10, paymentMethod: "card", note: "E2E completed.", products: [] },
  });
  assert("7. Staff can complete and record payment", complete.status === 200, JSON.stringify(complete.body));
  const transactionRows = await sql`select amount, discount, tip from transactions where appointment_id = ${appointment.id}`;
  assert("7a. Payment transaction stores net service revenue", transactionRows.length === 1 && Number(transactionRows[0].amount) === 50 && Number(transactionRows[0].discount) === 5 && Number(transactionRows[0].tip) === 10, JSON.stringify(transactionRows[0]));
  const accidentalProductRows = await sql`select count(*)::int as count from product_sales where appointment_id = ${appointment.id}`;
  assert("7b. Completing with no product selected creates zero product_sales", Number(accidentalProductRows[0].count) === 0, `product_sales=${accidentalProductRows[0].count}`);

  const duplicate = await request(`/api/staff/appointments/${appointment.id}/complete`, {
    method: "POST",
    jar: staffJar,
    json: { grossAmount: 55, discount: 0, tip: 0, paymentMethod: "card", note: "", products: [] },
  });
  assert("8. Duplicate completion is impossible", duplicate.status === 409 || duplicate.status === 400, `status=${duplicate.status}`);

  const overview = await request(`/admin?period=custom&from=${financialDate}&to=${financialDate}`, { jar: adminJar, raw: true });
  assert("9. Admin revenue updates", overview.status === 200 && normalizedText(overview.text).includes("EUR 50"), `status=${overview.status}`);
  const tipRows = await sql`select coalesce(sum(tip), 0)::numeric as tips from transactions where appointment_id = ${appointment.id}`;
  assert("10. Tips update", Number(tipRows[0].tips) === 10, `tips=${tipRows[0].tips}`);
  const serviceRevenueRows = await sql`select coalesce(sum(amount), 0)::numeric as revenue, coalesce(sum(tip), 0)::numeric as tips from transactions where payment_status = 'paid' and transaction_type = 'service'`;
  assert("10a. Tips do not inflate service revenue", Number(serviceRevenueRows[0].revenue) === 50 && Number(serviceRevenueRows[0].tips) === 10, JSON.stringify(serviceRevenueRows[0]));

  const productBooking = await request("/api/bookings", {
    method: "POST",
    json: { serviceId, staffId, date: targetDate, startTime: "10:30", firstName: "Product", lastName: "Client", email: "product@example.com", phone: "+32 470 99 88 77" },
  });
  const productAppointment = productBooking.body.appointment;
  const missingProductPayment = await request(`/api/staff/appointments/${productAppointment.id}/product-sales`, { method: "POST", jar: staffJar, json: { productId, quantity: 1 } });
  assert("new product sale requires real payment method", missingProductPayment.status === 400, `status=${missingProductPayment.status}`);
  const standaloneSale = await request(`/api/staff/appointments/${productAppointment.id}/product-sales`, { method: "POST", jar: staffJar, json: { productId, quantity: 1, paymentMethod: "bancontact" } });
  const completeAfterSale = await request(`/api/staff/appointments/${productAppointment.id}/complete`, { method: "POST", jar: staffJar, json: { grossAmount: 55, discount: 0, tip: 0, paymentMethod: "card", note: "", products: [] } });
  const productAfter = await sql`select stock_quantity from products where id = ${productId}`;
  const saleRows = await sql`select quantity, total_price, payment_method from product_sales where appointment_id = ${productAppointment.id}`;
  const reportsCsv = await request(`/api/admin/reports?period=custom&from=${financialDate}&to=${financialDate}`, { jar: adminJar, raw: true });
  assert("11. Product sale updates stock and reporting", standaloneSale.status === 200 && completeAfterSale.status === 200 && Number(productAfter[0].stock_quantity) === Number(productBefore[0].stock_quantity) - 1 && saleRows.length === 1 && reportsCsv.text.includes("E2E Shampoo"), `stock=${productAfter[0].stock_quantity} sales=${saleRows.length}`);
  assert("product payment method is recorded", String(saleRows[0]?.payment_method) === "bancontact", JSON.stringify(saleRows[0]));
  await sql`
    insert into product_sales (product_id, staff_id, customer_id, appointment_id, quantity, unit_price, total_price, payment_method, created_at)
    values (${productId}, ${staffId}, null, null, 1, 20, 20, 'unknown', ${brusselsDateTime(financialDate, "09:00").toISOString()})
  `;
  const legacyRows = await sql`select payment_method from product_sales where payment_method = 'unknown'`;
  assert("legacy product sale is not falsely classified as Card", legacyRows.length === 1, `unknown=${legacyRows.length}`);
  const totalServiceRevenueRows = await sql`select coalesce(sum(amount), 0)::numeric as revenue from transactions where payment_status = 'paid' and transaction_type = 'service'`;
  assert("11a. Product revenue does not inflate service transaction revenue", Number(totalServiceRevenueRows[0].revenue) === 105, `revenue=${totalServiceRevenueRows[0].revenue}`);
  const methodRows = await sql`
    with paid_methods as (
      select payment_method, amount
      from transactions
      where payment_status = 'paid' and transaction_type = 'service'
      union all
      select payment_method, total_price as amount
      from product_sales
    )
    select payment_method, coalesce(sum(amount), 0)::numeric as total
    from paid_methods
    group by payment_method
  `;
  const methodTotals = Object.fromEntries(methodRows.map((row) => [String(row.payment_method), Number(row.total)]));
  assert("payment-method report reconciles service + products", methodTotals.card === 105 && methodTotals.bancontact === 20 && methodTotals.unknown === 20, JSON.stringify(methodTotals));
  assert("no financial double counting", Number(totalServiceRevenueRows[0].revenue) === 105 && Number(saleRows[0].total_price) === 20, `service=${totalServiceRevenueRows[0].revenue} product=${saleRows[0].total_price}`);

  const [customerRow] = await sql`select customer_id::text from appointments where id = ${appointment.id}`;
  const next = await request(`/api/staff/customers/${customerRow.customer_id}/appointments`, { method: "POST", jar: staffJar, json: { serviceId, date: targetDate, startTime: "15:30", notes: "E2E next appointment." } });
  const slotsAfterNext = await getSlots(serviceId, staffId, targetDate);
  const staffAppointmentsAfterNext = await request("/staff/appointments", { jar: staffJar, raw: true });
  const adminAppointmentsAfterNext = await request("/admin/appointments?q=E2E", { jar: adminJar, raw: true });
  assert("11b. Schedule Next Appointment respects availability", next.status === 200 && !slotsAfterNext.some((slot) => slot.time === "15:30") && staffAppointmentsAfterNext.text.includes("15:30") && adminAppointmentsAfterNext.text.includes("15:30"), `next=${next.status}`);
  const scheduleAfterCompleteSlots = await getSlots(serviceId, staffId, settingsDate);
  const nextAfterComplete = await request(`/api/staff/customers/${customerRow.customer_id}/appointments`, { method: "POST", jar: staffJar, json: { serviceId, date: settingsDate, startTime: "13:00", notes: "E2E next after completed." } });
  assert("Schedule Next is available after completed appointment", nextAfterComplete.status === 200, `status=${nextAfterComplete.status}`);
  assert("Schedule Next displays only real available slots", scheduleAfterCompleteSlots.some((slot) => slot.time === "13:00") && !scheduleAfterCompleteSlots.some((slot) => slot.time === "10:30"), scheduleAfterCompleteSlots.map((slot) => slot.time).join(", "));
  const staffOverviewActions = await request("/staff", { jar: staffJar, raw: true });
  const staffAppointmentsActions = await request("/staff/appointments", { jar: staffJar, raw: true });
  const sharedActionLabels = ["Standalone product sale", "Products included here use the same payment method", "Schedule next appointment"];
  assert("Staff Overview and Staff Appointments expose identical valid actions", sharedActionLabels.every((label) => staffOverviewActions.text.includes(label) && staffAppointmentsActions.text.includes(label)), sharedActionLabels.join(", "));

  const collisionA = new CookieJar();
  collisionA.cookies = new Map(staffJar.cookies);
  const collisionB = new CookieJar();
  collisionB.cookies = new Map(staffJar.cookies);
  const collisionResults = await Promise.all([
    request(`/api/staff/customers/${customerRow.customer_id}/appointments`, { method: "POST", jar: collisionA, json: { serviceId, date: targetDate, startTime: "13:00", notes: "E2E collision A." } }),
    request(`/api/staff/customers/${customerRow.customer_id}/appointments`, { method: "POST", jar: collisionB, json: { serviceId, date: targetDate, startTime: "13:00", notes: "E2E collision B." } }),
  ]);
  assert("schedule-next collision returns 409", collisionResults.some((item) => item.status === 200) && collisionResults.some((item) => item.status === 409), collisionResults.map((item) => item.status).join(", "));

  const expense = await request("/api/admin/expenses", { method: "POST", jar: adminJar, json: { category: "E2E", description: "E2E expense", supplier: "Verifier", amount: 30, expenseDate: financialDate } });
  await createAdminCustomerAnalyticsFixtures(financialDate);
  const overviewAfterExpense = await request(`/admin?period=custom&from=${financialDate}&to=${financialDate}`, { jar: adminJar, raw: true });
  assert("12. Expense updates financial result", expense.status === 200 && overviewAfterExpense.text.includes("EUR 30"), `expenseStatus=${expense.status}`);
  const overviewText = normalizedText(overviewAfterExpense.text);
  assert("actual New/Returning analytics are correct", statValue(overviewText, "New customers") === "1" && statValue(overviewText, "Returning customers") === "1", `new=${statValue(overviewText, "New customers")} returning=${statValue(overviewText, "Returning customers")}`);
  const badInputs = await Promise.all([
    request(`/api/admin/services/${serviceId}`, { method: "PATCH", jar: adminJar, json: { name: "", category: "Haircuts", description: "Bad", price: 55, duration: 60, imageUrl: "", active: true, staffIds: [staffId] } }),
    request(`/api/admin/services/${serviceId}`, { method: "PATCH", jar: adminJar, json: { name: "Women's Haircut", category: "Haircuts", description: "Bad", price: 55, duration: 0, imageUrl: "", active: true, staffIds: [staffId] } }),
    request(`/api/admin/staff/${staffId}/schedule`, { method: "PUT", jar: adminJar, json: { schedules: [{ day: 3, start: "17:00", end: "09:00", lunchStart: "", lunchEnd: "", active: true }] } }),
    request(`/api/admin/staff/${staffId}/schedule`, { method: "PUT", jar: adminJar, json: { schedules: [{ day: 3, start: "09:00", end: "17:00", lunchStart: "08:00", lunchEnd: "08:30", active: true }] } }),
    request("/api/admin/products", { method: "POST", jar: adminJar, json: { name: "Bad product", sku: "BAD-STOCK", costPrice: 1, salePrice: 2, stock: -1, active: true } }),
  ]);
  assert("management inputs return 400 for invalid business data", badInputs.every((item) => item.status === 400), badInputs.map((item) => item.status).join(", "));

  const second = await request("/api/bookings", {
    method: "POST",
    json: { serviceId, staffId, date: targetDate, startTime: "10:30", firstName: "Move", lastName: "Me", email: "move@example.com", phone: "+32 470 22 33 44" },
  });
  const secondAppointment = second.body.appointment;
  const reschedule = await request(`/api/admin/appointments/${secondAppointment.id}`, {
    method: "PATCH",
    jar: adminJar,
    json: { status: "confirmed", staffId, serviceId, date: targetDate, time: rescheduledSlot, notes: "Admin rescheduled." },
  });
  const slotsAfterMove = await getSlots(serviceId, staffId, targetDate);
  const calendarAfterMove = await request(`/admin/calendar?date=${targetDate}&staffId=${staffId}`, { jar: adminJar, raw: true });
  assert("13. Admin reschedule changes staff calendar and availability", reschedule.status === 200 && !slotsAfterMove.some((slot) => slot.time === rescheduledSlot) && calendarAfterMove.text.includes("14:00"), `reschedule=${reschedule.status}`);

  const cancel = await request(`/api/admin/appointments/${secondAppointment.id}`, { method: "PATCH", jar: adminJar, json: { status: "cancelled", staffId, serviceId, date: targetDate, time: rescheduledSlot, notes: "Admin cancelled." } });
  const slotsAfterCancel = await getSlots(serviceId, staffId, targetDate);
  assert("14. Admin cancellation frees the slot", cancel.status === 200 && slotsAfterCancel.some((slot) => slot.time === rescheduledSlot), `cancel=${cancel.status}`);

  const schedule = await request(`/api/admin/staff/${staffId}/schedule`, {
    method: "PUT",
    jar: adminJar,
    json: { schedules: [{ day: 3, start: "13:00", end: "17:00", lunchStart: "", lunchEnd: "", active: true }] },
  });
  const slotsAfterSchedule = await getSlots(serviceId, staffId, targetDate);
  assert("15. Staff schedule changes affect public availability", schedule.status === 200 && !slotsAfterSchedule.some((slot) => slot.time === "10:30") && slotsAfterSchedule.some((slot) => slot.time === "14:00"), slotsAfterSchedule.map((slot) => slot.time).join(", "));

  const settings = await request("/api/admin/settings", {
    method: "PATCH",
    jar: adminJar,
    json: {
      salonName: "Maison Elegance",
      address: "Avenue Louise 120",
      phone: "+32 2 468 18 55",
      email: "hello@maisonelegance.be",
      bookingNotice: 120,
      maximumBookingPeriod: 90,
      cancellationDeadline: 24,
      slotInterval: 30,
      openingHours: [
        { day: 0, active: false }, { day: 1, active: false }, { day: 2, active: true, open: "09:00", close: "18:00" },
        { day: 3, active: true, open: "14:00", close: "17:00" }, { day: 4, active: true, open: "09:00", close: "20:00" },
        { day: 5, active: true, open: "09:00", close: "19:00" }, { day: 6, active: true, open: "09:00", close: "18:00" },
      ],
    },
  });
  const slotsAfterHours = await getSlots(serviceId, staffId, targetDate);
  assert("16. Salon opening-hour changes affect public availability", settings.status === 200 && !slotsAfterHours.some((slot) => slot.time === "13:00") && slotsAfterHours.some((slot) => slot.time === "14:00"), slotsAfterHours.map((slot) => slot.time).join(", "));

  const durationChange = await request(`/api/admin/services/${serviceId}`, {
    method: "PATCH",
    jar: adminJar,
    json: { name: "Women's Haircut", category: "Haircuts", description: "E2E duration change", price: 55, duration: 120, imageUrl: "", active: true, staffIds: [staffId, "julien"] },
  });
  const slotsAfterDuration = await getSlots(serviceId, staffId, targetDate);
  assert("17. Service duration changes affect available slots", durationChange.status === 200 && slotsAfterDuration.length < slotsAfterHours.length, `before=${slotsAfterHours.length} after=${slotsAfterDuration.length}`);

  await sql`update staff set active = false where id = 'julien'`;
  const disabledLogin = await login("julien@maisonelegance.be", "staff123", false);
  assert("18. Disabled staff cannot log in", disabledLogin.status === 303 && String(disabledLogin.headers.get("location") ?? "").includes("/login?error=invalid"), `status=${disabledLogin.status} location=${disabledLogin.headers.get("location")}`);

  const adminLogoutHtml = await request("/admin", { jar: adminJar, raw: true });
  const staffLogoutHtml = await request("/staff", { jar: staffJar, raw: true });
  assert("20. Admin logout exists on desktop/mobile markup", adminLogoutHtml.text.includes("Sign out"), "Sign out missing");
  assert("20a. Staff logout exists on desktop/mobile markup", staffLogoutHtml.text.includes("Logout"), "Logout missing");
  const adminLogout = await request("/api/internal/logout", { method: "POST", jar: adminJar, redirect: "manual", raw: true });
  const staffLogout = await request("/api/internal/logout", { method: "POST", jar: staffJar, redirect: "manual", raw: true });
  const adminAfterLogout = await request("/admin", { jar: adminJar, redirect: "manual", raw: true });
  const staffAfterLogout = await request("/staff", { jar: staffJar, redirect: "manual", raw: true });
  assert("20b. Logout works from Admin", [302, 303, 307].includes(adminLogout.status) && [302, 307].includes(adminAfterLogout.status), `logout=${adminLogout.status} after=${adminAfterLogout.status}`);
  assert("20c. Logout works from Staff", [302, 303, 307].includes(staffLogout.status) && [302, 307].includes(staffAfterLogout.status), `logout=${staffLogout.status} after=${staffAfterLogout.status}`);

  await verifyDatabaseFanOutRegression(settingsDate);
  await verifyRoutesAndMarkup(adminJar, staffJar);
}

async function verifyDatabaseFanOutRegression(date) {
  const [customer] = await sql`
    insert into customers (first_name, last_name, email, phone)
    values ('Fanout', 'Customer', 'fanout.customer@example.com', '+32 470 00 00 01')
    returning id::text
  `;
  const firstStart = brusselsDateTime(date, "09:00");
  const secondStart = brusselsDateTime(date, "10:30");
  const firstEnd = brusselsDateTime(date, "10:00");
  const secondEnd = brusselsDateTime(date, "11:30");
  const fanoutAppointments = await sql`
    insert into appointments (booking_reference, customer_id, service_id, staff_id, start_at, end_at, duration, price, status, notes)
    values
      ('FANOUT-C1', ${customer.id}, 'women-cut', 'julien', ${firstStart.toISOString()}, ${firstEnd.toISOString()}, 60, 55, 'completed', 'Fanout regression.'),
      ('FANOUT-C2', ${customer.id}, 'women-cut', 'julien', ${secondStart.toISOString()}, ${secondEnd.toISOString()}, 60, 55, 'completed', 'Fanout regression.')
    returning id::text
  `;
  await sql`
    insert into transactions (appointment_id, customer_id, staff_id, amount, discount, tip, payment_method, payment_status, transaction_type)
    values
      (${fanoutAppointments[0].id}, ${customer.id}, 'julien', 40, 0, 4, 'card', 'paid', 'service'),
      (${fanoutAppointments[1].id}, ${customer.id}, 'julien', 60, 0, 6, 'card', 'paid', 'service')
  `;
  const [customerAggregate] = await sql`
    with appointment_stats as (
      select customer_id, count(*)::int as appointments
      from appointments
      where customer_id = ${customer.id}
      group by customer_id
    ),
    transaction_stats as (
      select customer_id, coalesce(sum(amount), 0)::numeric as service_spend
      from transactions
      where customer_id = ${customer.id} and payment_status = 'paid' and transaction_type = 'service'
      group by customer_id
    )
    select coalesce(a.appointments, 0)::int as appointments, coalesce(t.service_spend, 0)::numeric as service_spend
    from customers c
    left join appointment_stats a on a.customer_id = c.id
    left join transaction_stats t on t.customer_id = c.id
    where c.id = ${customer.id}
  `;
  assert("customer aggregation does not fan out", Number(customerAggregate.appointments) === 2 && Number(customerAggregate.service_spend) === 100, JSON.stringify(customerAggregate));

  await sql`
    insert into staff (id, first_name, last_name, job_title, bio, phone, email, languages, specialties, active)
    values ('fanout-staff', 'Fanout', 'Staff', 'Stylist', 'Regression staff.', '+32 470 00 00 02', 'fanout.staff@example.com', array['English'], array['Cuts'], true)
  `;
  await sql`insert into services (id, name, category, description, price, duration, active) values ('fanout-service', 'Fanout Service', 'Haircuts', 'Regression service.', 50, 45, true)`;
  await sql`insert into staff_services (staff_id, service_id) values ('sophie', 'fanout-service'), ('julien', 'fanout-service'), ('fanout-staff', 'fanout-service')`;
  const [serviceCustomer] = await sql`
    insert into customers (first_name, last_name, email, phone)
    values ('Fanout', 'Service', 'fanout.service@example.com', '+32 470 00 00 03')
    returning id::text
  `;
  await sql`
    insert into appointments (booking_reference, customer_id, service_id, staff_id, start_at, end_at, duration, price, status, notes)
    values
      ('FANOUT-S1', ${serviceCustomer.id}, 'fanout-service', 'julien', ${brusselsDateTime(date, "13:00").toISOString()}, ${brusselsDateTime(date, "13:45").toISOString()}, 45, 50, 'completed', 'Fanout regression.'),
      ('FANOUT-S2', ${serviceCustomer.id}, 'fanout-service', 'julien', ${brusselsDateTime(date, "15:00").toISOString()}, ${brusselsDateTime(date, "15:45").toISOString()}, 45, 50, 'completed', 'Fanout regression.')
  `;
  const [serviceAggregate] = await sql`
    select s.id::text, count(distinct a.id)::int as appointment_count
    from services s
    left join staff_services ss on ss.service_id = s.id
    left join appointments a on a.service_id = s.id
    where s.id = 'fanout-service'
    group by s.id
  `;
  assert("service appointment count does not fan out", Number(serviceAggregate.appointment_count) === 2, JSON.stringify(serviceAggregate));
}

async function verifyMigrationSchema() {
  const indexRows = await sql`
    select indexname
    from pg_indexes
    where schemaname = current_schema()
      and indexname in ('customers_normalized_email_idx', 'customers_normalized_phone_idx')
  `;
  const [paymentColumn] = await sql`
    select column_default, is_nullable
    from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'product_sales'
      and column_name = 'payment_method'
  `;
  const [paymentConstraint] = await sql`
    select pg_get_constraintdef(c.oid) as definition
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = current_schema()
      and t.relname = 'product_sales'
      and c.conname = 'product_sales_payment_method_allowed'
  `;
  assert("migration 007/008 schema correct", indexRows.length === 2 && paymentColumn?.is_nullable === "NO" && paymentColumn?.column_default === null && String(paymentConstraint?.definition ?? "").includes("unknown"), JSON.stringify({ indexes: indexRows, paymentColumn, paymentConstraint }));
}

async function verifyCustomerIdentityConflictsAndRaces({ serviceId, staffId, date }) {
  const [emailCustomer] = await sql`
    insert into customers (first_name, last_name, email, phone)
    values ('Email', 'Match', 'identity-email@example.com', '+32 470 00 10 01')
    returning id::text
  `;
  const [phoneCustomer] = await sql`
    insert into customers (first_name, last_name, email, phone)
    values ('Phone', 'Match', 'identity-phone@example.com', '+32 470 00 10 02')
    returning id::text
  `;
  const conflictBooking = await request("/api/bookings", {
    method: "POST",
    json: { serviceId, staffId, date, startTime: "15:00", firstName: "Conflict", lastName: "Client", email: "identity-email@example.com", phone: "+32 470 00 10 02" },
  });
  const [conflictAppointment] = await sql`select customer_id::text from appointments where booking_reference = ${conflictBooking.body?.appointment?.reference ?? ""}`;
  const [audit] = await sql`select count(*)::int as count from audit_logs where action = 'customer_identity_conflict'`;
  assert("email/phone conflict does not merge different customers", conflictBooking.status === 201 && conflictAppointment.customer_id !== emailCustomer.id && conflictAppointment.customer_id !== phoneCustomer.id && Number(audit.count) === 1, JSON.stringify({ status: conflictBooking.status, customer: conflictAppointment?.customer_id, emailCustomer: emailCustomer.id, phoneCustomer: phoneCustomer.id, audits: audit.count }));

  const raceA = request("/api/bookings", {
    method: "POST",
    json: { serviceId, staffId, date, startTime: "09:30", firstName: "Race", lastName: "Client", email: "Race.Customer@Example.com", phone: "+32 470 00 20 01" },
  });
  const raceB = request("/api/bookings", {
    method: "POST",
    json: { serviceId, staffId, date, startTime: "14:00", firstName: "Race", lastName: "Client", email: "race.customer@example.com", phone: "+32 470 00 20 02" },
  });
  const raceResults = await Promise.all([raceA, raceB]);
  const raceRows = await sql`
    select count(distinct c.id)::int as customers, count(a.id)::int as appointments
    from customers c
    join appointments a on a.customer_id = c.id
    where lower(trim(c.email)) = 'race.customer@example.com'
  `;
  assert("simultaneous same-email bookings produce one customer", raceResults.every((item) => item.status === 201) && Number(raceRows[0].customers) === 1 && Number(raceRows[0].appointments) === 2, JSON.stringify({ statuses: raceResults.map((item) => item.status), row: raceRows[0] }));
}

async function createAdminCustomerAnalyticsFixtures(financialDate) {
  const previousDate = addDays(financialDate, -14);
  const [returningCustomer] = await sql`
    insert into customers (first_name, last_name, email, phone)
    values ('Returning', 'Metric', 'returning.metric@example.com', '+32 470 30 00 01')
    returning id::text
  `;
  const [newCustomer] = await sql`
    insert into customers (first_name, last_name, email, phone)
    values ('New', 'Metric', 'new.metric@example.com', '+32 470 30 00 02')
    returning id::text
  `;
  await sql`
    insert into appointments (booking_reference, customer_id, service_id, staff_id, start_at, end_at, duration, price, status, notes)
    values
      ('RET-METRIC-OLD', ${returningCustomer.id}, 'men-cut', 'julien', ${brusselsDateTime(previousDate, "08:00").toISOString()}, ${brusselsDateTime(previousDate, "08:40").toISOString()}, 40, 38, 'completed', 'Returning metric old visit.'),
      ('RET-METRIC-IN', ${returningCustomer.id}, 'men-cut', 'julien', ${brusselsDateTime(financialDate, "08:00").toISOString()}, ${brusselsDateTime(financialDate, "08:40").toISOString()}, 40, 38, 'completed', 'Returning metric in range.'),
      ('NEW-METRIC-IN', ${newCustomer.id}, 'men-cut', 'julien', ${brusselsDateTime(financialDate, "08:45").toISOString()}, ${brusselsDateTime(financialDate, "09:25").toISOString()}, 40, 38, 'completed', 'New metric in range.')
  `;
}

async function verifyRoutesAndMarkup(adminJar, staffJar) {
  const publicRoutes = ["/", "/services", "/team", "/gallery", "/reviews", "/about", "/contact", "/book", "/login"];
  const adminRoutes = ["/admin", "/admin/calendar", "/admin/appointments", "/admin/customers", "/admin/staff", "/admin/services", "/admin/products", "/admin/payments", "/admin/expenses", "/admin/reports", "/admin/settings"];
  const staffRoutes = ["/staff", "/staff/appointments", "/staff/calendar", "/staff/customers", "/staff/schedule", "/staff/performance"];
  for (const route of publicRoutes) {
    const response = await request(route, { raw: true });
    assert(`Navigation route ${route}`, response.status === 200, `status=${response.status}`);
    assert(`No dead hash links on ${route}`, !/href=["']#["']/.test(response.text), "found href=\"#\"");
  }
  for (const route of adminRoutes) {
    const response = await request(route, { jar: adminJar, raw: true });
    assert(`Admin route ${route}`, response.status === 200, `status=${response.status}`);
    assert(`No placeholder text on ${route}`, !/not available yet|editing .* not available yet|intentionally present as a real protected route/i.test(response.text), "placeholder copy found");
  }
  for (const route of staffRoutes) {
    const response = await request(route, { jar: staffJar, raw: true });
    assert(`Staff route ${route}`, response.status === 200, `status=${response.status}`);
    assert(`No placeholder text on ${route}`, !/not available yet|editing .* not available yet|intentionally present as a real protected route/i.test(response.text), "placeholder copy found");
  }
}

async function getSlots(serviceId, staffId, date) {
  const response = await request(`/api/availability/times?serviceId=${serviceId}&staffId=${staffId}&date=${date}`);
  if (response.status !== 200) return [];
  return response.body.slots ?? [];
}

async function createDirectAppointment({ date, startTime, endTime, status, customerEmail, serviceId = "women-cut", staffId = "sophie" }) {
  const [customer] = await sql`
    insert into customers (first_name, last_name, email, phone)
    values ('Direct', 'Appointment', ${customerEmail}, '+32 470 12 00 00')
    returning id::text
  `;
  const [appointment] = await sql`
    insert into appointments (booking_reference, customer_id, service_id, staff_id, start_at, end_at, duration, price, status, notes)
    values (${`DIRECT-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`}, ${customer.id}, ${serviceId}, ${staffId}, ${brusselsDateTime(date, startTime).toISOString()}, ${brusselsDateTime(date, endTime).toISOString()}, 60, 55, ${status}, 'E2E direct appointment.')
    returning id::text
  `;
  return appointment.id;
}

async function login(email, password, expectSuccess = true) {
  const jar = new CookieJar();
  const response = await request("/api/internal/login", {
    method: "POST",
    jar,
    redirect: "manual",
    form: { email, password },
    raw: true,
  });
  if (expectSuccess) assert(`Login ${email}`, [302, 303].includes(response.status), `status=${response.status}`);
  return expectSuccess ? jar : response;
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers ?? {});
  let body;
  if (options.json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(options.json);
  }
  if (options.form !== undefined) {
    headers.set("content-type", "application/x-www-form-urlencoded");
    body = new URLSearchParams(options.form).toString();
  }
  if (options.jar) {
    const cookie = options.jar.header();
    if (cookie) headers.set("cookie", cookie);
  }
  const response = await fetchWithTimeout(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
    redirect: options.redirect ?? "follow",
  }, options.timeoutMs ?? 15000);
  options.jar?.store(response.headers);
  const text = await response.text();
  if (options.raw) return { status: response.status, text, headers: response.headers };
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { text };
  }
  return { status: response.status, body: parsed, text, headers: response.headers };
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }
  store(headers) {
    const values = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : splitSetCookie(headers.get("set-cookie"));
    for (const value of values) {
      const [pair] = value.split(";");
      const index = pair.indexOf("=");
      if (index > 0) this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
  }
  header() {
    return Array.from(this.cookies.entries()).map(([key, value]) => `${key}=${value}`).join("; ");
  }
}

function splitSetCookie(value) {
  if (!value) return [];
  return value.split(/,(?=\s*[^;,]+=)/g);
}

function normalizedText(html) {
  return html.replace(/<!--.*?-->/g, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function statValue(text, label) {
  const match = text.match(new RegExp(`${label}\\s+([^\\s]+)`));
  return match?.[1] ?? "";
}

function brusselsDate(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function nextWeekdayDate(dayOfWeek, minimumDaysAhead) {
  const now = new Date();
  for (let offset = minimumDaysAhead; offset < minimumDaysAhead + 21; offset += 1) {
    const candidate = new Date(now);
    candidate.setUTCDate(candidate.getUTCDate() + offset);
    const date = brusselsDate(candidate);
    const localDay = new Date(`${date}T00:00:00`).getDay();
    if (localDay === dayOfWeek) return date;
  }
  throw new Error(`Unable to find weekday ${dayOfWeek}`);
}

function addDays(date, days) {
  const parsed = brusselsDateTime(date, "12:00");
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return brusselsDate(parsed);
}

function brusselsDateTime(date, time) {
  const offset = getBrusselsOffset(date, time);
  return new Date(`${date}T${time}:00${offset}`);
}

function getBrusselsOffset(date, time) {
  const probe = new Date(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Brussels",
    timeZoneName: "shortOffset",
    hour: "2-digit",
  }).formatToParts(probe);
  const offsetName = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT+1";
  const match = offsetName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return "+01:00";
  return `${match[1]}${match[2].padStart(2, "0")}:${match[3] ?? "00"}`;
}

function assert(name, condition, detail = "") {
  results.push({ name, status: condition ? "PASS" : "FAIL", detail: condition ? "" : detail });
  console.log(`${condition ? "PASS" : "FAIL"}: ${name}${condition || !detail ? "" : ` -- ${detail}`}`);
}

function printResults() {
  const pass = results.filter((item) => item.status === "PASS").length;
  const fail = results.filter((item) => item.status === "FAIL").length;
  console.log(`SUMMARY: ${pass} PASS, ${fail} FAIL`);
}

async function startServer() {
  const readinessDate = nextWeekdayDate(3, 7);
  const child = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "start", "--", "--port", String(port), "--hostname", "127.0.0.1"], {
    cwd: process.cwd(),
    env: { ...process.env, POSTGRES_URL: appUrl, DATABASE_URL: "", INTERNAL_AUTH_SECRET: "e2e-functional-secret" },
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
  child.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
  child.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await delay(500);
    try {
      const response = await fetchWithTimeout(`${baseUrl}/api/availability/times?serviceId=women-cut&staffId=sophie&date=${readinessDate}`, {}, 3000);
      if (response.status === 200) return child;
    } catch {}
    if (child.exitCode !== null) throw new Error(`Server exited early: ${serverOutput.slice(-2000)}`);
  }
  throw new Error(`Server did not become ready: ${serverOutput.slice(-2000)}`);
}

async function seed(db) {
  const staffHash = await bcrypt.hash("staff123", 12);
  const adminHash = await bcrypt.hash("admin123", 12);
  await db`
    insert into salon_settings (id, salon_name, description, address, phone, email, website, opening_hours)
    values ('maison-elegance', 'Maison Elegance', 'E2E salon', 'Avenue Louise 120', '+32 2 468 18 55', 'hello@maisonelegance.be', 'http://localhost', '{}'::jsonb)
  `;
  await db`
    insert into salon_opening_hours (day_of_week, open_time, close_time, active)
    values
      (0, null, null, false), (1, null, null, false), (2, '09:00', '18:00', true),
      (3, '09:00', '18:00', true), (4, '09:00', '20:00', true), (5, '09:00', '19:00', true), (6, '09:00', '18:00', true)
  `;
  await db`
    insert into services (id, name, category, description, price, duration, active)
    values
      ('women-cut', 'Women''s Haircut', 'Haircuts', 'Cut and styling.', 55, 60, true),
      ('men-cut', 'Men''s Haircut', 'Haircuts', 'Precision cut.', 38, 40, true)
  `;
  await db`
    insert into staff (id, first_name, last_name, job_title, bio, phone, email, languages, specialties, active)
    values
      ('sophie', 'Sophie', 'Laurent', 'Senior Stylist', 'Cuts and color.', '+32 471 15 81 21', 'sophie@maisonelegance.be', array['English'], array['Cuts'], true),
      ('julien', 'Julien', 'Moreau', 'Master Stylist', 'Cuts.', '+32 471 15 81 22', 'julien@maisonelegance.be', array['English'], array['Cuts'], true)
  `;
  await db`insert into staff_services (staff_id, service_id) values ('sophie', 'women-cut'), ('julien', 'women-cut'), ('julien', 'men-cut')`;
  await db`
    insert into staff_working_hours (staff_id, day_of_week, start_time, end_time, lunch_start, lunch_end, active)
    values
      ('sophie', 3, '09:00', '17:00', '12:00', '13:00', true),
      ('julien', 3, '09:00', '17:00', '12:00', '13:00', true)
  `;
  await db`
    insert into profiles (first_name, last_name, email, phone, role, staff_id, password_hash, active)
    values
      ('Sophie', 'Laurent', 'staff@maisonelegance.be', '+32 471 15 81 21', 'staff', 'sophie', ${staffHash}, true),
      ('Julien', 'Moreau', 'julien@maisonelegance.be', '+32 471 15 81 22', 'staff', 'julien', ${staffHash}, true),
      ('Admin', 'Manager', 'admin@maisonelegance.be', '+32 2 468 18 55', 'admin', null, ${adminHash}, true)
  `;
  await db`insert into products (name, sku, cost_price, sale_price, stock_quantity, active) values ('E2E Shampoo', 'E2E-SHAMPOO', 8, 20, 5, true)`;
}

function withSearchPath(url, schemaName) {
  const parsed = new URL(url);
  parsed.searchParams.set("options", `--search_path=${schemaName}`);
  return parsed.toString();
}

function quoteIdent(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function killTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === "win32") {
      execFileSync("taskkill", ["/pid", String(pid), "/t", "/f"], { stdio: "ignore" });
    } else {
      process.kill(-pid, "SIGTERM");
    }
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
  }
}

async function main() {
  try {
    await rootSql.unsafe(`create schema ${quoteIdent(schema)}`);
    await sql.unsafe(await readFile("database/schema.sql", "utf8"));
    await seed(sql);
    server = await startServer();
    await runChecks();
    printResults();
    if (results.some((item) => item.status === "FAIL")) {
      if (serverOutput) console.log(`SERVER OUTPUT:\n${serverOutput.slice(-4000)}`);
      process.exitCode = 1;
    }
  } catch (error) {
    results.push({ name: "E2E harness", status: "FAIL", detail: error instanceof Error ? error.message : String(error) });
    console.log(`FAIL: E2E harness -- ${error instanceof Error ? error.message : String(error)}`);
    printResults();
    process.exitCode = 1;
  } finally {
    if (server) killTree(server.pid);
    await sql.end({ timeout: 1 }).catch(() => {});
    await rootSql.unsafe(`drop schema if exists ${quoteIdent(schema)} cascade`).catch(() => {});
    await rootSql.end({ timeout: 1 }).catch(() => {});
  }
}

await main();
