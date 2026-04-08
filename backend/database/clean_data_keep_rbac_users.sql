-- =========================================
-- CLEAN ALL DATA EXCEPT ROLES, PERMISSIONS, AND USERS
-- =========================================
-- This script removes all business data while preserving:
-- - Roles
-- - Permissions
-- - Role Permissions
-- - Users
-- - Countries (seeded data)
-- =========================================

-- Disable triggers temporarily for faster deletion
SET session_replication_role = 'replica';

-- =========================================
-- 1. CLEAN AUDIT & LOGS
-- =========================================
TRUNCATE TABLE audit_logs CASCADE;
TRUNCATE TABLE login_audit CASCADE;

-- =========================================
-- 2. CLEAN EMPLOYEE DATA
-- =========================================
TRUNCATE TABLE attendance CASCADE;
TRUNCATE TABLE leaves CASCADE;

-- =========================================
-- 3. CLEAN OPERATIONS
-- =========================================
TRUNCATE TABLE complaint_activities CASCADE;
TRUNCATE TABLE complaints CASCADE;

-- =========================================
-- 4. CLEAN CUSTOMER DATA
-- =========================================
TRUNCATE TABLE customer_leads CASCADE;
TRUNCATE TABLE customers CASCADE;

-- =========================================
-- 5. CLEAN VISA MODULE
-- =========================================
TRUNCATE TABLE visa_documents CASCADE;
TRUNCATE TABLE documentation_checklist CASCADE;
TRUNCATE TABLE visa_cases CASCADE;
TRUNCATE TABLE suppliers CASCADE;

-- =========================================
-- 6. CLEAN PAYMENT & BOOKING
-- =========================================
TRUNCATE TABLE refunds CASCADE;
TRUNCATE TABLE invoices CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE bookings CASCADE;

-- =========================================
-- 7. CLEAN QUOTATION
-- =========================================
TRUNCATE TABLE quotation_views CASCADE;
TRUNCATE TABLE quotation_items CASCADE;
TRUNCATE TABLE quotations CASCADE;

-- =========================================
-- 8. CLEAN LEAD MANAGEMENT
-- =========================================
TRUNCATE TABLE followups CASCADE;
TRUNCATE TABLE lead_activities CASCADE;
TRUNCATE TABLE queued_leads CASCADE;
TRUNCATE TABLE leads CASCADE;

-- =========================================
-- 9. CLEAN MARKETING
-- =========================================
TRUNCATE TABLE campaigns CASCADE;

-- =========================================
-- 10. CLEAN DESTINATION & PRICING
-- =========================================
TRUNCATE TABLE destination_pricing CASCADE;
TRUNCATE TABLE destinations CASCADE;

-- =========================================
-- 11. CLEAN ADDITIONAL MODULES (if exist)
-- =========================================
-- Token blacklist
TRUNCATE TABLE IF EXISTS token_blacklist CASCADE;

-- Settings
TRUNCATE TABLE IF EXISTS settings CASCADE;

-- Notifications
TRUNCATE TABLE IF EXISTS notifications CASCADE;

-- Packages
TRUNCATE TABLE IF EXISTS packages CASCADE;
TRUNCATE TABLE IF EXISTS package_itineraries CASCADE;

-- Lead assignment history
TRUNCATE TABLE IF EXISTS lead_assignment_history CASCADE;

-- Followup reminders and history
TRUNCATE TABLE IF EXISTS followup_reminders CASCADE;
TRUNCATE TABLE IF EXISTS followup_history CASCADE;

-- Supplier settlements
TRUNCATE TABLE IF EXISTS supplier_payable_settlements CASCADE;

-- Payment invoice uploads
TRUNCATE TABLE IF EXISTS payment_invoice_uploads CASCADE;

-- =========================================
-- 12. CLEAN USER-RELATED DATA (OPTIONAL)
-- =========================================
-- Remove user country assignments (optional - uncomment if needed)
-- TRUNCATE TABLE IF EXISTS user_countries CASCADE;

-- Reset user fields to defaults (optional - uncomment if needed)
-- UPDATE users SET
--   is_on_leave = FALSE,
--   failed_login_attempts = 0,
--   account_locked_until = NULL,
--   last_login = NULL,
--   target_amount = NULL,
--   incentive_percent = NULL,
--   expertise_destinations = NULL;

-- =========================================
-- 13. RE-ENABLE TRIGGERS
-- =========================================
SET session_replication_role = 'origin';

-- =========================================
-- 14. VACUUM & ANALYZE
-- =========================================
VACUUM ANALYZE;

-- =========================================
-- SUMMARY
-- =========================================
SELECT 'Data cleanup completed successfully!' AS status;
SELECT 'Preserved: roles, permissions, role_permissions, users, countries' AS preserved;
SELECT 'Deleted: All business data (leads, bookings, payments, etc.)' AS deleted;
