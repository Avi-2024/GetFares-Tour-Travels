-- Dynamic RBAC enhancements
-- Makes permissions fully DB-managed and role grants toggleable.

ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE permissions
  ADD COLUMN IF NOT EXISTS key VARCHAR(120),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

UPDATE permissions
SET key = name
WHERE key IS NULL;

ALTER TABLE permissions
  ALTER COLUMN key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_permissions_key ON permissions(key);
CREATE INDEX IF NOT EXISTS idx_permissions_is_active ON permissions(is_active);

ALTER TABLE role_permissions
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_active
  ON role_permissions(role_id, is_active);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_active
  ON role_permissions(permission_id, is_active);
