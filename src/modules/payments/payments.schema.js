const PaymentsSchema = Object.freeze({
  tableName: 'payments',
  bookingsTable: 'bookings',
  refundsTable: 'refunds',
  entityName: 'Payments',
});

module.exports = { PaymentsSchema };
