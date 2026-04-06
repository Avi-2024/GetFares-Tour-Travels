const SuppliersSchema = Object.freeze({
  tableName: "suppliers",
  payablesTable: "supplier_payables",
  settlementsTable: "supplier_payable_settlements",
  payableAlertLogsTable: "supplier_payable_alert_logs",
  bookingsTable: "bookings",
  usersTable: "users",
  entityName: "Suppliers",
});

export { SuppliersSchema };
