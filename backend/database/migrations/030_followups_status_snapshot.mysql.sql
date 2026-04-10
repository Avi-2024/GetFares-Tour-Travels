START TRANSACTION;

ALTER TABLE followups
  ADD COLUMN status_snapshot VARCHAR(60);

ALTER TABLE followups
  ADD COLUMN counts_toward_compliance BOOLEAN DEFAULT TRUE;

UPDATE followups
SET counts_toward_compliance = TRUE
WHERE counts_toward_compliance IS NULL;

COMMIT;
