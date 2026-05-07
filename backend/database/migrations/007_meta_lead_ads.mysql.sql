-- Meta Lead Ads webhook support (MySQL)
-- Adds a Meta lead identifier for idempotent ingestion

ALTER TABLE leads
  ADD COLUMN meta_lead_id VARCHAR(120);

CREATE UNIQUE INDEX idx_leads_meta_lead_id ON leads(meta_lead_id);
