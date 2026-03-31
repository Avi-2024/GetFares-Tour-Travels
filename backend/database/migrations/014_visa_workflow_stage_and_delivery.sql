ALTER TABLE visa_cases
  ADD COLUMN IF NOT EXISTS workflow_stage VARCHAR(50),
  ADD COLUMN IF NOT EXISTS delivered_at DATE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE visa_cases
SET workflow_stage = CASE COALESCE(status::text, 'DOCUMENT_PENDING')
  WHEN 'DOCUMENT_PENDING' THEN 'DOCUMENT_COLLECTION'
  WHEN 'SUBMITTED' THEN CASE
    WHEN appointment_date IS NOT NULL THEN 'BIOMETRICS_SCHEDULED'
    WHEN submission_date IS NOT NULL THEN 'APPLICATION_SUBMITTED'
    ELSE 'UNDER_PROCESS'
  END
  WHEN 'APPROVED' THEN 'APPROVED'
  WHEN 'REJECTED' THEN 'REJECTED'
  ELSE 'DOCUMENT_COLLECTION'
END
WHERE workflow_stage IS NULL;

UPDATE visa_cases
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

ALTER TABLE visa_cases
  ALTER COLUMN workflow_stage SET DEFAULT 'DOCUMENT_COLLECTION';

CREATE INDEX IF NOT EXISTS idx_visa_cases_workflow_stage
  ON visa_cases (workflow_stage);

CREATE INDEX IF NOT EXISTS idx_visa_cases_appointment_date
  ON visa_cases (appointment_date);

CREATE INDEX IF NOT EXISTS idx_visa_cases_visa_valid_until
  ON visa_cases (visa_valid_until);
