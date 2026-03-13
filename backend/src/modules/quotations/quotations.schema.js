const QuotationsSchema = Object.freeze({
  tableName: 'quotations',
  itemsTable: 'quotation_items',
  viewsTable: 'quotation_views',
  templatesTable: 'quotation_templates',
  versionLogsTable: 'quotation_version_logs',
  sendLogsTable: 'quotation_send_logs',
  reminderLogsTable: 'quotation_reminder_logs',
  leadsTable: 'leads',
  bookingsTable: 'bookings',
  usersTable: 'users',
  entityName: 'Quotations',
});

module.exports = { QuotationsSchema };
