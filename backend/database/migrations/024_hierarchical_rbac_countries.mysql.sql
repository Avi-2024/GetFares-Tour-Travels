-- =========================================
-- 024_hierarchical_rbac_countries.sql (MySQL)
-- Additive migration for:
-- - country master
-- - multi-country user mapping
-- - optional normalized lead country reference
-- - assignment history audit
-- - parent_id alias for hierarchy
-- =========================================

CREATE TABLE IF NOT EXISTS countries (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by CHAR(36),
    updated_by CHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_countries_is_active ON countries(is_active);
CREATE INDEX idx_countries_name ON countries(name);

CREATE TABLE IF NOT EXISTS user_countries (
    user_id CHAR(36) NOT NULL,
    country_id CHAR(36) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_by CHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, country_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_user_primary_country
  ON user_countries(user_id, is_primary);

ALTER TABLE users
  ADD COLUMN parent_id CHAR(36);

ALTER TABLE users
  ADD CONSTRAINT fk_users_parent
  FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE leads
  ADD COLUMN country_id CHAR(36);

ALTER TABLE leads
  ADD CONSTRAINT fk_leads_country
  FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE SET NULL;

CREATE INDEX idx_users_parent_id ON users(parent_id);
CREATE INDEX idx_leads_country_id ON leads(country_id);

CREATE TABLE IF NOT EXISTS lead_assignment_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    lead_id CHAR(36) NOT NULL,
    previous_assignee_id CHAR(36),
    new_assignee_id CHAR(36),
    assigned_by CHAR(36),
    mode VARCHAR(50),
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (previous_assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (new_assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_lead_assignment_history_lead_id
  ON lead_assignment_history(lead_id, created_at DESC);
CREATE INDEX idx_lead_assignment_history_new_assignee
  ON lead_assignment_history(new_assignee_id, created_at DESC);

-- Seed baseline countries (safe idempotent)
INSERT INTO countries (code, name)
VALUES
  ('IN', 'India'),
  ('AE', 'UAE')
ON DUPLICATE KEY UPDATE code = code;

-- Backfill parent_id from manager_id (keeps existing hierarchy intact)
UPDATE users
SET parent_id = manager_id
WHERE parent_id IS NULL
  AND manager_id IS NOT NULL;

-- Backfill lead.country_id from existing lead_country text when possible
UPDATE leads l
JOIN countries c ON LOWER(TRIM(l.lead_country)) = LOWER(TRIM(c.name))
SET l.country_id = c.id
WHERE l.country_id IS NULL
  AND l.lead_country IS NOT NULL;

-- Backfill user_countries from existing users.agent_country text when possible
INSERT INTO user_countries (user_id, country_id, is_primary)
SELECT u.id, c.id, TRUE
FROM users u
JOIN countries c ON LOWER(TRIM(u.agent_country)) = LOWER(TRIM(c.name))
ON DUPLICATE KEY UPDATE is_primary = VALUES(is_primary);
