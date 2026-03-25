-- =====================================================
-- TRAVEL CRM - CLEAN DATABASE SCRIPT
-- Drops all tables, types, and sequences created by the CRM schema.
-- Use with caution: this will delete ALL data.
-- =====================================================

-- Drop tables first (dependencies handled via CASCADE where needed)
DROP TABLE IF EXISTS
  schema_migrations,
  notification_events,
  login_audit,
  role_permissions,
  permissions,
  roles,
  users,
  destinations,
  destination_pricing,
  campaigns,
  customers,
  leads,
  queued_leads,
  lead_activities,
  followups,
  customer_leads,
  quotation_templates,
  quotations,
  quotation_items,
  quotation_views,
  quotation_version_logs,
  quotation_send_logs,
  quotation_reminder_logs,
  bookings,
  booking_status_history,
  payments,
  invoices,
  refunds,
  suppliers,
  supplier_payables,
  tax_ledger,
  exchange_rates,
  visa_cases,
  visa_documents,
  documentation_checklist,
  booking_documents,
  packages,
  package_enquiries,
  complaints,
  complaint_activities,
  attendance,
  leaves,
  audit_logs
CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS
  customer_segment,
  lead_status,
  quote_status,
  booking_status,
  payment_status,
  refund_status,
  visa_status,
  payable_status,
  complaint_status
CASCADE;

-- Optional: drop any leftover sequences (if created outside serial defaults)
-- DROP SEQUENCE IF EXISTS some_custom_sequence CASCADE;
