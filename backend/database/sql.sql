-- =====================================================
-- Seed Roles and Permissions
-- Based on ROLES_AND_PERMISSIONS.md
-- =====================================================

-- Insert Permissions
INSERT INTO permissions (key, description, is_active) VALUES
-- Core System
('*', 'All permissions (wildcard)', true),
('rbac:manage', 'Manage roles and permissions', true),

-- Users Module
('users:read', 'View users', true),
('users:create', 'Create users', true),
('users:update', 'Update users', true),

-- Settings Module
('settings:read', 'View settings', true),
('settings:update', 'Update settings', true),

-- Leads Module
('leads:read', 'View leads', true),
('leads:create', 'Create leads', true),
('leads:update', 'Update leads (assign, followups, status)', true),
('leads:*', 'All lead permissions', true),

-- Quotations Module
('quotations:read', 'View quotations', true),
('quotations:create', 'Create quotations', true),
('quotations:update', 'Update quotations', true),
('quotations:*', 'All quotation permissions', true),

-- Bookings Module
('bookings:read', 'View bookings', true),
('bookings:create', 'Create bookings', true),
('bookings:update', 'Update bookings (status, approval)', true),
('bookings:*', 'All booking permissions', true),

-- Payments Module
('payments:read', 'View payments', true),
('payments:create', 'Create payments', true),
('payments:update', 'Update payments', true),
('payments:*', 'All payment permissions', true),

-- Refunds Module
('refunds:read', 'View refunds', true),
('refunds:create', 'Create refunds', true),
('refunds:update', 'Update refunds', true),
('refunds:*', 'All refund permissions', true),

-- Customers Module
('customers:read', 'View customers', true),
('customers:create', 'Create customers', true),
('customers:update', 'Update customers', true),
('customers:*', 'All customer permissions', true),

-- Campaigns Module
('campaigns:read', 'View campaigns', true),
('campaigns:create', 'Create campaigns', true),
('campaigns:update', 'Update campaigns', true),
('campaigns:*', 'All campaign permissions', true),

-- Visa Module
('visa:read', 'View visa applications', true),
('visa:create', 'Create visa applications', true),
('visa:update', 'Update visa applications', true),
('visa:*', 'All visa permissions', true),

-- Complaints Module
('complaints:read', 'View complaints', true),
('complaints:create', 'Create complaints', true),
('complaints:update', 'Update complaints', true),
('complaints:*', 'All complaint permissions', true),

-- Reports Module
('reports:read', 'View reports and analytics', true),

-- Notifications Module
('notifications:read', 'View notifications', true),
('notifications:update', 'Update notifications (mark as read)', true),

-- Suppliers Module
('suppliers:read', 'View suppliers', true),
('suppliers:create', 'Create suppliers', true),
('suppliers:update', 'Update suppliers', true),

-- Employees Module
('employees:read', 'View employees', true),
('employees:update', 'Update employees', true)
ON CONFLICT (key) DO NOTHING;

-- Insert Roles
INSERT INTO roles (name, description) VALUES
('super_admin', 'Complete system control and configuration'),
('admin', 'Full operational access and user management'),
('manager', 'Team oversight and performance monitoring'),
('sales_consultant', 'Lead management and quotation creation'),
('visa_executive', 'Visa application processing'),
('accounts', 'Financial operations and payment tracking'),
('marketing', 'Campaign management and lead analytics'),
('management', 'Dashboard monitoring and reporting')
ON CONFLICT (name) DO NOTHING;

-- Assign Permissions to Roles

-- Super Admin: All permissions
INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT
  (SELECT id FROM roles WHERE name = 'super_admin'),
  id,
  true
FROM permissions
WHERE key = '*'
ON CONFLICT DO NOTHING;

-- Admin: All permissions
INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT
  (SELECT id FROM roles WHERE name = 'admin'),
  id,
  true
FROM permissions
WHERE key = '*'
ON CONFLICT DO NOTHING;

-- Manager: 16 permissions
INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT
  (SELECT id FROM roles WHERE name = 'manager'),
  id,
  true
FROM permissions
WHERE key IN (
  'users:read',
  'leads:*',
  'quotations:*',
  'bookings:*',
  'customers:*',
  'campaigns:read',
  'visa:read',
  'payments:read',
  'refunds:read',
  'complaints:read',
  'reports:read',
  'suppliers:read',
  'suppliers:create',
  'suppliers:update',
  'notifications:read',
  'notifications:update'
)
ON CONFLICT DO NOTHING;

-- Sales Consultant: 15 permissions
INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT
  (SELECT id FROM roles WHERE name = 'sales_consultant'),
  id,
  true
FROM permissions
WHERE key IN (
  'leads:*',
  'quotations:*',
  'bookings:create',
  'bookings:read',
  'bookings:update',
  'customers:read',
  'campaigns:read',
  'visa:read',
  'suppliers:read',
  'suppliers:create',
  'suppliers:update',
  'complaints:create',
  'complaints:read',
  'notifications:read',
  'notifications:update'
)
ON CONFLICT DO NOTHING;

-- Visa Executive: 8 permissions
INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT
  (SELECT id FROM roles WHERE name = 'visa_executive'),
  id,
  true
FROM permissions
WHERE key IN (
  'visa:*',
  'leads:read',
  'quotations:read',
  'bookings:read',
  'customers:read',
  'complaints:read',
  'notifications:read',
  'notifications:update'
)
ON CONFLICT DO NOTHING;

-- Accounts: 11 permissions
INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT
  (SELECT id FROM roles WHERE name = 'accounts'),
  id,
  true
FROM permissions
WHERE key IN (
  'payments:*',
  'refunds:*',
  'bookings:read',
  'quotations:read',
  'customers:read',
  'suppliers:read',
  'suppliers:update',
  'reports:read',
  'notifications:read',
  'notifications:update'
)
ON CONFLICT DO NOTHING;

-- Marketing: 8 permissions
INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT
  (SELECT id FROM roles WHERE name = 'marketing'),
  id,
  true
FROM permissions
WHERE key IN (
  'campaigns:*',
  'leads:read',
  'customers:read',
  'quotations:read',
  'reports:read',
  'notifications:read',
  'notifications:update'
)
ON CONFLICT DO NOTHING;

-- -- Management: 13 permissions (read-only)
-- INSERT INTO role_permissions (role_id, permission_id, is_active)
-- SELECT
--   (SELECT id FROM roles WHERE name = 'management'),
--   id,
--   true
-- FROM permissions
-- WHERE key IN (
--   'reports:read',
--   'leads:read',
--   'quotations:read',
--   'bookings:read',
--   'payments:read',
--   'refunds:read',
--   'visa:read',
--   'campaigns:read',
--   'customers:read',
--   'complaints:read',
--   'suppliers:read',
--   'notifications:read',
--   'notifications:update'
-- )
-- ON CONFLICT DO NOTHING;
