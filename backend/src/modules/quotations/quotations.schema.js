const QuotationsSchema = Object.freeze({
  tableName: 'quotations',
  itemsTable: 'quotation_items',
  viewsTable: 'quotation_views',
  leadsTable: 'leads',
  bookingsTable: 'bookings',
  usersTable: 'users',
  entityName: 'Quotations',
});

module.exports = { QuotationsSchema };
