-- =====================================================
-- PRD/SOP hardening (MySQL)
-- - Lead qualification: preferred hotel category
-- - Follow-up cadence tracking metadata
-- - Packages pricing policy fields
-- =====================================================

ALTER TABLE leads
  ADD COLUMN preferred_hotel_category VARCHAR(20);

ALTER TABLE followups
  ADD COLUMN cadence_code VARCHAR(50);

CREATE INDEX idx_followups_lead_cadence_code
  ON followups(lead_id, cadence_code);

ALTER TABLE packages
  ADD COLUMN base_cost DECIMAL(12,2) DEFAULT 0 CHECK (base_cost >= 0),
  ADD COLUMN markup_percent DECIMAL(5,2) DEFAULT 0 CHECK (markup_percent >= 0 AND markup_percent <= 100);
