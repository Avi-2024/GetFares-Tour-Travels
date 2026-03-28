-- Complete database cleanup script
-- Run this FIRST before running database.sql

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS 
    audit_logs,
    leaves,
    attendance,
    complaint_activities,
    lead_assignment_history,
    complaints,
    package_enquiries,
    packages,
    exchange_rates,
    tax_ledger,
    supplier_payables,
    booking_documents,
    documentation_checklist,
    visa_documents,
    visa_cases,
    suppliers,
    refunds,
    invoices,
    payments,
    booking_status_history,
    bookings,
    quotation_reminder_logs,
    quotation_send_logs,
    quotation_version_logs,
    quotation_views,
    quotation_items,
    quotations,
    quotation_templates,
    customer_leads,
    followups,
    lead_activities,
    queued_leads,
    leads,
    customers,
    notification_events,
    campaigns,
    user_countries,
    countries,
    destination_pricing,
    destinations,
    login_audit,
    users,
    role_permissions,
    permissions,
    roles
CASCADE;

-- Drop all custom types
DROP TYPE IF EXISTS 
    complaint_status,
    payable_status,
    visa_status,
    refund_status,
    payment_status,
    booking_status,
    quote_status,
    lead_status,
    customer_segment
CASCADE;
