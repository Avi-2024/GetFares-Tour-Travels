ALTER TABLE users
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

UPDATE users
SET active = TRUE
WHERE active IS NULL;

CREATE TABLE IF NOT EXISTS queued_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    reason VARCHAR(100),
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (lead_id)
);

CREATE INDEX IF NOT EXISTS idx_users_active
  ON users(active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_queued_leads_pending
  ON queued_leads(queued_at ASC) WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_queued_leads_lead_id
  ON queued_leads(lead_id);
