const BookingsSchema = Object.freeze({
  tableName: "bookings",
  quotationsTable: "quotations",
  leadsTable: "leads",
  destinationsTable: "destinations",
  paymentsTable: "payments",
  refundsTable: "refunds",
  invoicesTable: "invoices",
  statusHistoryTable: "booking_status_history",
  reminderLogsTable: "booking_reminder_logs",
  deadlineAlertLogsTable: "booking_deadline_alert_logs",
  usersTable: "users",
  entityName: "Bookings",
});

export { BookingsSchema };
