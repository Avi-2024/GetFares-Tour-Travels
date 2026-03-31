-- Add country column to roles table for multi-country RBAC
ALTER TABLE roles ADD COLUMN IF NOT EXISTS country VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_roles_country
  ON roles(country) WHERE country IS NOT NULL;
