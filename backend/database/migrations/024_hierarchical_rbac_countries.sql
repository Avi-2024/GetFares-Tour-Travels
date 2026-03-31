-- =========================================
-- 024_hierarchical_rbac_countries.sql
-- Additive migration for:
-- - country master
-- - multi-country user mapping
-- - optional normalized lead country reference
-- - assignment history audit
-- - parent_id alias for hierarchy
-- =========================================

CREATE TABLE IF NOT EXISTS countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_countries_is_active ON countries(is_active);
CREATE INDEX IF NOT EXISTS idx_countries_name ON countries(name);

CREATE TABLE IF NOT EXISTS user_countries (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, country_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_primary_country
  ON user_countries(user_id)
  WHERE is_primary = TRUE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES countries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id);
CREATE INDEX IF NOT EXISTS idx_leads_country_id ON leads(country_id);

CREATE TABLE IF NOT EXISTS lead_assignment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    previous_assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    new_assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    mode VARCHAR(50),
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lead_assignment_history_lead_id
  ON lead_assignment_history(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_assignment_history_new_assignee
  ON lead_assignment_history(new_assignee_id, created_at DESC);

-- Seed baseline countries (safe idempotent)
INSERT INTO countries (code, name)
VALUES
  ('IN', 'India'),
  ('AE', 'UAE')
ON CONFLICT (code) DO NOTHING;

-- Backfill parent_id from manager_id (keeps existing hierarchy intact)
UPDATE users
SET parent_id = manager_id
WHERE parent_id IS NULL
  AND manager_id IS NOT NULL;

-- Backfill lead.country_id from existing lead_country text when possible
UPDATE leads l
SET country_id = c.id
FROM countries c
WHERE l.country_id IS NULL
  AND l.lead_country IS NOT NULL
  AND LOWER(TRIM(l.lead_country)) = LOWER(TRIM(c.name));

-- Backfill user_countries from existing users.agent_country text when possible
INSERT INTO user_countries (user_id, country_id, is_primary)
SELECT u.id, c.id, TRUE
FROM users u
JOIN countries c ON LOWER(TRIM(u.agent_country)) = LOWER(TRIM(c.name))
ON CONFLICT (user_id, country_id)
DO UPDATE SET is_primary = EXCLUDED.is_primary;
