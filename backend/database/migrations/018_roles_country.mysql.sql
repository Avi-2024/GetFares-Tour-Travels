-- Add country column to roles table for multi-country RBAC (MySQL)
ALTER TABLE roles ADD COLUMN country VARCHAR(100);

CREATE INDEX idx_roles_country
  ON roles(country);
