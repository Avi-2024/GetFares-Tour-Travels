START TRANSACTION;

CREATE TEMPORARY TABLE tmp_roles (
  role_code VARCHAR(50) PRIMARY KEY,
  role_description TEXT
);

INSERT INTO tmp_roles (role_code, role_description) VALUES
('super_admin', 'Complete system control and configuration'),
('admin', 'Full operational access and user management'),
('manager', 'Team oversight and performance monitoring'),
('sales_consultant', 'Lead management and quotation creation'),
('visa_executive', 'Visa application processing'),
('accounts', 'Financial operations and payment tracking'),
('marketing', 'Campaign management and lead analytics'),
('management', 'Dashboard monitoring and reporting');

INSERT INTO roles (`name`, `description`, `is_active`)
SELECT tr.role_code, tr.role_description, TRUE
FROM tmp_roles tr
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `is_active` = TRUE,
  `updated_at` = CURRENT_TIMESTAMP;

CREATE TEMPORARY TABLE tmp_permissions (
  perm_key VARCHAR(120) PRIMARY KEY,
  perm_description TEXT
);

INSERT INTO tmp_permissions (perm_key, perm_description) VALUES
('*', 'All permissions (wildcard)'),
('rbac:manage', 'Manage roles and permissions'),

('users:read', 'View users'),
('users:create', 'Create users'),
('users:update', 'Update users'),

('settings:read', 'View settings'),
('settings:update', 'Update settings'),

('leads:read', 'View leads'),
('leads:create', 'Create leads'),
('leads:update', 'Update leads'),
('leads:*', 'All lead permissions'),

('quotations:read', 'View quotations'),
('quotations:create', 'Create quotations'),
('quotations:update', 'Update quotations'),
('quotations:*', 'All quotation permissions'),

('bookings:read', 'View bookings'),
('bookings:create', 'Create bookings'),
('bookings:update', 'Update bookings'),
('bookings:*', 'All booking permissions'),

('payments:read', 'View payments'),
('payments:create', 'Create payments'),
('payments:update', 'Update payments'),
('payments:*', 'All payment permissions'),

('refunds:read', 'View refunds'),
('refunds:create', 'Create refunds'),
('refunds:update', 'Update refunds'),
('refunds:*', 'All refund permissions'),

('customers:read', 'View customers'),
('customers:create', 'Create customers'),
('customers:update', 'Update customers'),
('customers:*', 'All customer permissions'),

('campaigns:read', 'View campaigns'),
('campaigns:create', 'Create campaigns'),
('campaigns:update', 'Update campaigns'),
('campaigns:*', 'All campaign permissions'),

('visa:read', 'View visa applications'),
('visa:create', 'Create visa applications'),
('visa:update', 'Update visa applications'),
('visa:*', 'All visa permissions'),

('complaints:read', 'View complaints'),
('complaints:create', 'Create complaints'),
('complaints:update', 'Update complaints'),
('complaints:*', 'All complaint permissions'),

('reports:read', 'View reports and analytics'),

('notifications:read', 'View notifications'),
('notifications:update', 'Update notifications'),

('suppliers:read', 'View suppliers'),
('suppliers:create', 'Create suppliers'),
('suppliers:update', 'Update suppliers'),

('employees:read', 'View employees'),
('employees:update', 'Update employees');

INSERT INTO permissions (`name`, `key`, `description`, `is_active`)
SELECT tp.perm_key, tp.perm_key, tp.perm_description, TRUE
FROM tmp_permissions tp
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `is_active` = TRUE,
  `updated_at` = CURRENT_TIMESTAMP;

CREATE TEMPORARY TABLE tmp_role_permissions (
  role_code VARCHAR(50),
  perm_key VARCHAR(120),
  PRIMARY KEY (role_code, perm_key)
);

INSERT INTO tmp_role_permissions (role_code, perm_key) VALUES
('super_admin', '*'),
('super_admin', 'rbac:manage'),
('admin', '*'),
('admin', 'rbac:manage'),

('manager', 'users:read'),
('manager', 'leads:*'),
('manager', 'quotations:*'),
('manager', 'bookings:*'),
('manager', 'customers:*'),
('manager', 'campaigns:read'),
('manager', 'visa:read'),
('manager', 'payments:read'),
('manager', 'refunds:read'),
('manager', 'complaints:read'),
('manager', 'reports:read'),
('manager', 'suppliers:read'),
('manager', 'suppliers:create'),
('manager', 'suppliers:update'),
('manager', 'notifications:read'),
('manager', 'notifications:update'),

('sales_consultant', 'leads:*'),
('sales_consultant', 'quotations:*'),
('sales_consultant', 'bookings:create'),
('sales_consultant', 'bookings:read'),
('sales_consultant', 'bookings:update'),
('sales_consultant', 'customers:read'),
('sales_consultant', 'visa:read'),
('sales_consultant', 'suppliers:read'),
('sales_consultant', 'suppliers:create'),
('sales_consultant', 'suppliers:update'),
('sales_consultant', 'complaints:create'),
('sales_consultant', 'complaints:read'),
('sales_consultant', 'notifications:read'),
('sales_consultant', 'notifications:update'),

('visa_executive', 'visa:*'),
('visa_executive', 'leads:read'),
('visa_executive', 'quotations:read'),
('visa_executive', 'bookings:read'),
('visa_executive', 'customers:read'),
('visa_executive', 'complaints:read'),
('visa_executive', 'notifications:read'),
('visa_executive', 'notifications:update'),

('accounts', 'payments:*'),
('accounts', 'refunds:*'),
('accounts', 'bookings:read'),
('accounts', 'quotations:read'),
('accounts', 'customers:read'),
('accounts', 'suppliers:read'),
('accounts', 'suppliers:update'),
('accounts', 'reports:read'),
('accounts', 'notifications:read'),
('accounts', 'notifications:update'),

('marketing', 'campaigns:*'),
('marketing', 'leads:read'),
('marketing', 'customers:read'),
('marketing', 'quotations:read'),
('marketing', 'reports:read'),
('marketing', 'notifications:read'),
('marketing', 'notifications:update'),

('management', 'reports:read'),
('management', 'leads:read'),
('management', 'quotations:read'),
('management', 'bookings:read'),
('management', 'payments:read'),
('management', 'refunds:read'),
('management', 'visa:read'),
('management', 'campaigns:read'),
('management', 'customers:read'),
('management', 'complaints:read'),
('management', 'suppliers:read'),
('management', 'notifications:read'),
('management', 'notifications:update');

INSERT IGNORE INTO role_permissions (role_id, permission_id, is_active)
SELECT r.id, p.id, TRUE
FROM tmp_role_permissions trp
JOIN roles r ON r.name = trp.role_code
JOIN permissions p ON p.`key` = trp.perm_key;

UPDATE role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
JOIN tmp_role_permissions trp ON trp.role_code = r.name AND trp.perm_key = p.`key`
SET rp.is_active = TRUE, rp.updated_at = CURRENT_TIMESTAMP;

COMMIT;

SELECT name, is_active FROM roles ORDER BY name;
SELECT `key`, is_active FROM permissions ORDER BY `key`;
SELECT r.name AS role_name, p.`key` AS permission_key, rp.is_active
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
ORDER BY r.name, p.`key`;
