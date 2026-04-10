-- Dynamic RBAC enhancements (MySQL)
-- Makes permissions fully DB-managed and role grants toggleable.

ALTER TABLE roles
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE permissions
  ADD COLUMN `key` VARCHAR(120),
  ADD COLUMN description TEXT,
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

UPDATE permissions
SET `key` = name
WHERE `key` IS NULL;

ALTER TABLE permissions
  MODIFY COLUMN `key` VARCHAR(120) NOT NULL;

CREATE UNIQUE INDEX uq_permissions_key ON permissions(`key`);
CREATE INDEX idx_permissions_is_active ON permissions(is_active);

ALTER TABLE role_permissions
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

CREATE INDEX idx_role_permissions_role_active
  ON role_permissions(role_id, is_active);

CREATE INDEX idx_role_permissions_permission_active
  ON role_permissions(permission_id, is_active);
