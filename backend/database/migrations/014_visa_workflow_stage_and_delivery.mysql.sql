ALTER TABLE visa_cases
  ADD COLUMN workflow_stage VARCHAR(50),
  ADD COLUMN delivered_at DATE,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

UPDATE visa_cases
SET workflow_stage = CASE COALESCE(status, 'DOCUMENT_PENDING')
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
SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL;

ALTER TABLE visa_cases
  MODIFY COLUMN workflow_stage VARCHAR(50) DEFAULT 'DOCUMENT_COLLECTION';

CREATE INDEX idx_visa_cases_workflow_stage
  ON visa_cases (workflow_stage);

CREATE INDEX idx_visa_cases_appointment_date
  ON visa_cases (appointment_date);

CREATE INDEX idx_visa_cases_visa_valid_until
  ON visa_cases (visa_valid_until);
