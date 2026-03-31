-- =====================================================
-- PRD/SOP hardening
-- - Lead qualification: preferred hotel category
-- - Follow-up cadence tracking metadata
-- - Packages pricing policy fields
-- =====================================================

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS preferred_hotel_category VARCHAR(20);

ALTER TABLE followups
  ADD COLUMN IF NOT EXISTS cadence_code VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_followups_lead_cadence_code
  ON followups(lead_id, cadence_code);

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS base_cost NUMERIC(12,2) DEFAULT 0 CHECK (base_cost >= 0),
  ADD COLUMN IF NOT EXISTS markup_percent NUMERIC(5,2) DEFAULT 0 CHECK (markup_percent >= 0 AND markup_percent <= 100);

