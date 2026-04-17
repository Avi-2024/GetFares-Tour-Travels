-- Preview users
SELECT u.id, u.email, u.full_name, r.name AS role_name, u.is_active, u.active
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE r.name IN ('abcd1234','xyz','lmno','abcd','admin');

-- Soft delete (recommended)
UPDATE users u
JOIN roles r ON r.id = u.role_id
SET u.is_active = 0, u.active = 0
WHERE r.name IN ('abcd1234','xyz','lmno','abcd','admin');

-- Hard delete (danger)
DELETE u
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE r.name IN ('abcd1234','xyz','lmno','abcd','admin');