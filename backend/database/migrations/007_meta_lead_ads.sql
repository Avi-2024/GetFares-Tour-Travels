-- Meta Lead Ads webhook support
-- Adds a Meta lead identifier for idempotent ingestion

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS meta_lead_id VARCHAR(120);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_meta_lead_id ON leads(meta_lead_id);
