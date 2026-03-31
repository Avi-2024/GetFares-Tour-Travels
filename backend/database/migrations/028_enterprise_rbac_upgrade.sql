-- ============================================================
-- Migration 028: Enterprise RBAC + Permissions Upgrade
-- ============================================================

-- 1. Ensure lead_scope exists on roles (idempotent)
ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS lead_scope VARCHAR(10) NOT NULL DEFAULT 'ALL'
  CHECK (lead_scope IN ('ALL', 'TEAM', 'OWN'));

-- 2. Ensure permissions table has key column (already exists, just ensure index)
CREATE UNIQUE INDEX IF NOT EXISTS uq_permissions_key ON permissions(key);
CREATE INDEX IF NOT EXISTS idx_permissions_active ON permissions(is_active) WHERE is_active = TRUE;

-- 3. Ensure role_permissions has is_active (already exists)
CREATE INDEX IF NOT EXISTS idx_role_permissions_lookup
  ON role_permissions(role_id, permission_id) WHERE is_active = TRUE;

-- 4. Add manager_id to users (hierarchical TEAM scope)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id) WHERE manager_id IS NOT NULL;

-- 5. Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(60)  NOT NULL,
  entity      VARCHAR(60)  NOT NULL,
  entity_id   UUID,
  meta        JSONB,
  ip_address  VARCHAR(50),
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity  ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- 6. Field-level security: role_field_policies
CREATE TABLE IF NOT EXISTS role_field_policies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  entity     VARCHAR(60) NOT NULL,   -- e.g. 'lead'
  field      VARCHAR(60) NOT NULL,   -- e.g. 'budget'
  access     VARCHAR(10) NOT NULL DEFAULT 'HIDDEN'
             CHECK (access IN ('VISIBLE', 'HIDDEN', 'MASKED')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (role_id, entity, field)
);

CREATE INDEX IF NOT EXISTS idx_field_policies_role ON role_field_policies(role_id, entity);

-- 7. Performance indexes on leads
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to    ON leads(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_status_created ON leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_country        ON leads(lead_country) WHERE lead_country IS NOT NULL;

-- 8. Seed lead_scope values
UPDATE roles SET lead_scope = 'ALL'  WHERE name IN ('super_admin','admin','accounts','marketing','management');
UPDATE roles SET lead_scope = 'TEAM' WHERE name IN ('manager','department_head','team_lead');
UPDATE roles SET lead_scope = 'OWN'  WHERE name IN ('agent','sales_consultant','holiday_consultant','visa_executive');

-- 9. Seed granular lead permissions (idempotent)
INSERT INTO permissions (name, key, description, is_active) VALUES
  ('lead.read',   'lead.read',   'View leads',          TRUE),
  ('lead.create', 'lead.create', 'Create leads',        TRUE),
  ('lead.update', 'lead.update', 'Update leads',        TRUE),
  ('lead.delete', 'lead.delete', 'Delete leads',        TRUE),
  ('lead.assign', 'lead.assign', 'Assign leads',        TRUE),
  ('lead.export', 'lead.export', 'Export leads to CSV', TRUE)
ON CONFLICT (key) DO NOTHING;

-- 10. Seed field policies: agents cannot see budget/revenue
INSERT INTO role_field_policies (role_id, entity, field, access)
SELECT r.id, 'lead', f.field, 'HIDDEN'
FROM roles r
CROSS JOIN (VALUES ('budget'), ('revenue'), ('margin')) AS f(field)
WHERE r.name IN ('sales_consultant', 'holiday_consultant', 'agent', 'visa_executive')
ON CONFLICT (role_id, entity, field) DO NOTHING;
