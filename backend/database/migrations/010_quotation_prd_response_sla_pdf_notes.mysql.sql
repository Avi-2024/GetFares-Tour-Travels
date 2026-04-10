-- =====================================================
-- MODULE 2 PRD HARDENING (Quotation Management) - MySQL
-- - important notes persistence
-- - lead->quote sent tracking + SLA tracking
-- - response category normalization
-- =====================================================

ALTER TABLE quotations
  ADD COLUMN important_notes TEXT;

ALTER TABLE quotations
  ADD COLUMN lead_to_quote_sent_minutes INT;

ALTER TABLE quotations
  ADD COLUMN response_category VARCHAR(30);

ALTER TABLE quotations
  ADD COLUMN response_sla_minutes INT;

ALTER TABLE quotations
  ADD COLUMN response_sla_breached BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE quotations
  ADD CONSTRAINT chk_quotations_response_category
  CHECK (
    response_category IS NULL OR
    response_category IN ('READY_PACKAGE', 'CUSTOMIZED', 'COMPLEX_ITINERARY')
  );

ALTER TABLE quotations
  ADD CONSTRAINT chk_quotations_response_sla_minutes
  CHECK (response_sla_minutes IS NULL OR response_sla_minutes > 0);

UPDATE quotations
SET response_category = CASE
  WHEN response_category IS NOT NULL THEN response_category
  WHEN JSON_UNQUOTE(JSON_EXTRACT(template_snapshot, '$.templateType')) = 'READY_PACKAGE' THEN 'READY_PACKAGE'
  WHEN JSON_UNQUOTE(JSON_EXTRACT(template_snapshot, '$.templateType')) = 'CUSTOM_ITINERARY' THEN 'CUSTOMIZED'
  ELSE 'CUSTOMIZED'
END
WHERE response_category IS NULL;

UPDATE quotations
SET response_sla_minutes = CASE response_category
  WHEN 'READY_PACKAGE' THEN 30
  WHEN 'COMPLEX_ITINERARY' THEN 360
  ELSE 120
END
WHERE response_sla_minutes IS NULL;

UPDATE quotations
SET response_sla_breached = CASE
  WHEN lead_to_quote_sent_minutes IS NULL OR response_sla_minutes IS NULL THEN FALSE
  WHEN lead_to_quote_sent_minutes > response_sla_minutes THEN TRUE
  ELSE FALSE
END;

CREATE INDEX idx_quotations_response_category
  ON quotations(response_category);

CREATE INDEX idx_quotations_response_sla_breached
  ON quotations(response_sla_breached, sent_at DESC);
