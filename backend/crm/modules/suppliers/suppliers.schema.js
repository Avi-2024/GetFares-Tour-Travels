const SuppliersSchema = Object.freeze({
  tableName: "suppliers",
  payablesTable: "supplier_payables",
  settlementsTable: "supplier_payable_settlements",
  payableAlertLogsTable: "supplier_payable_alert_logs",
  bookingsTable: "bookings",
  quotationsTable: "quotations",
  usersTable: "users",
  entityName: "Suppliers",
});

export { SuppliersSchema };
