-- Preview users
SELECT u.id, u.email, u.full_name, r.name AS role_name, u.is_active, u.active
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE r.name IN ('abcd1234','xyz','lmno','abcd','admin','manager','marketting','accounts','sales_consultant');

-- Soft delete (recommended)
UPDATE users u
JOIN roles r ON r.id = u.role_id
SET u.is_active = 0, u.active = 0
WHERE r.name IN ('abcd1234','xyz','lmno','abcd','admin','manager','marketting','accounts','sales_consultant');

-- Hard delete (danger)
DELETE u
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE r.name IN ('abcd1234','xyz','lmno','abcd','admin','manager','marketting','accounts','sales_consultant');


-- delete all sales_consultant except tushar
DELETE u
FROM users u
JOIN roles r ON r.id=u.role_id
WHERE r.name='sales_consultant'
  AND u.email <> 'tushar@gmail.com';





DELETE FROM roles
WHERE name IN (
  'abcd1234','xyz','lmno','abcd','admin','manager','marketting','accounts'
);

SELECT
  l.lead_code,
  l.full_name,
  l.email,
  u.full_name  AS assigned_to_name,
  ub.full_name AS assigned_by_name,
  l.assigned_at
FROM leads l
LEFT JOIN users u ON u.id = l.assigned_to
LEFT JOIN lead_assignment_history lah
  ON lah.lead_id = l.id
 AND lah.created_at = (
   SELECT MAX(x.created_at)
   FROM lead_assignment_history x
   WHERE x.lead_id = l.id
 )
LEFT JOIN users ub ON ub.id = lah.assigned_by
ORDER BY l.assigned_at DESC
LIMIT 5000;




SELECT
  u.id,
  u.full_name,
  u.email,
  u.phone,
  u.agent_country,
  u.agent_type,
  r.name AS role_name,
  u.is_active,
  COALESCE(u.is_on_leave, 0) AS is_on_leave
FROM users u
LEFT JOIN roles r ON r.id = u.role_id
WHERE u.is_active = 1
  AND COALESCE(u.is_on_leave, 0) = 0
  AND r.name IN ('sales_consultant')
ORDER BY u.agent_country, r.name, u.full_name;








SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE login_audit;

TRUNCATE TABLE destination_pricing;
TRUNCATE TABLE destinations;

TRUNCATE TABLE campaigns;

TRUNCATE TABLE lead_activities;
TRUNCATE TABLE followups;
TRUNCATE TABLE queued_leads;
TRUNCATE TABLE leads;

TRUNCATE TABLE quotation_items;
TRUNCATE TABLE quotation_views;
TRUNCATE TABLE quotations;

TRUNCATE TABLE payments;
TRUNCATE TABLE invoices;
TRUNCATE TABLE refunds;
TRUNCATE TABLE bookings;

TRUNCATE TABLE visa_documents;
TRUNCATE TABLE documentation_checklist;
TRUNCATE TABLE visa_cases;

TRUNCATE TABLE suppliers;

TRUNCATE TABLE customer_leads;
TRUNCATE TABLE customers;

TRUNCATE TABLE complaint_activities;
TRUNCATE TABLE complaints;

TRUNCATE TABLE attendance;
TRUNCATE TABLE leaves;

TRUNCATE TABLE audit_logs;

SET FOREIGN_KEY_CHECKS = 1;