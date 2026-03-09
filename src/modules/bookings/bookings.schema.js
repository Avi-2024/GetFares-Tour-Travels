const BookingsSchema = Object.freeze({
  tableName: 'bookings',
  quotationsTable: 'quotations',
  paymentsTable: 'payments',
  refundsTable: 'refunds',
  invoicesTable: 'invoices',
  statusHistoryTable: 'booking_status_history',
  entityName: 'Bookings',
});

module.exports = { BookingsSchema };
