-- Add lead_scope to roles so lead visibility is data-driven, not hardcoded.
-- Scopes: ALL (see everything), TEAM (manager sees own team), OWN (agent sees own leads only)

ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS lead_scope VARCHAR(10) NOT NULL DEFAULT 'ALL'
  CHECK (lead_scope IN ('ALL', 'TEAM', 'OWN'));

UPDATE roles SET lead_scope = 'ALL' WHERE name IN ('super_admin', 'admin', 'accounts', 'marketing', 'management');
UPDATE roles SET lead_scope = 'TEAM' WHERE name IN ('manager', 'department_head', 'team_lead');
UPDATE roles SET lead_scope = 'OWN'  WHERE name IN ('agent', 'sales_consultant', 'holiday_consultant', 'visa_executive');
