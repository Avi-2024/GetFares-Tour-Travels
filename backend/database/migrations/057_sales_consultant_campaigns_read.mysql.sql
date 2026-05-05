INSERT IGNORE INTO role_permissions (role_id, permission_id, is_active)
SELECT
  r.id,
  p.id,
  1
FROM roles r
INNER JOIN permissions p ON p.`key` = 'campaigns:read'
WHERE r.name = 'sales_consultant';
