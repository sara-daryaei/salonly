export type StaffAppointmentStat = {
  staff_id: string;
  appointments: number;
  completed: number;
};

export type StaffTransactionStat = {
  staff_id: string;
  revenue: number;
  tips: number;
  transaction_count: number;
};

export function mergeStaffReportingRows(input: {
  staff: { id: string; name: string }[];
  appointmentStats: StaffAppointmentStat[];
  transactionStats: StaffTransactionStat[];
}) {
  const appointmentByStaff = new Map(input.appointmentStats.map((row) => [row.staff_id, row]));
  const transactionByStaff = new Map(input.transactionStats.map((row) => [row.staff_id, row]));

  return input.staff.map((person) => {
    const appointments = appointmentByStaff.get(person.id);
    const transactions = transactionByStaff.get(person.id);
    const revenue = transactions?.revenue ?? 0;
    const transactionCount = transactions?.transaction_count ?? 0;
    return {
      staffId: person.id,
      name: person.name,
      appointments: appointments?.appointments ?? 0,
      completed: appointments?.completed ?? 0,
      revenue,
      averageTicket: transactionCount ? revenue / transactionCount : 0,
      tips: transactions?.tips ?? 0,
    };
  });
}
