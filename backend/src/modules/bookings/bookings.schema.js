const BookingsSchema = Object.freeze({
  tableName: "bookings",
  quotationsTable: "quotations",
  paymentsTable: "payments",
  refundsTable: "refunds",
  invoicesTable: "invoices",
  statusHistoryTable: "booking_status_history",
  reminderLogsTable: "booking_reminder_logs",
  usersTable: "users",
  entityName: "Bookings",
});

export { BookingsSchema };
