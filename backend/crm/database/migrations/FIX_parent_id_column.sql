-- Quick fix: Add parent_id column to users table if it doesn't exist
-- This is extracted from migration 024_hierarchical_rbac_countries.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id);

-- Backfill parent_id from manager_id (keeps existing hierarchy intact)
UPDATE users
SET parent_id = manager_id
WHERE parent_id IS NULL
  AND manager_id IS NOT NULL;
