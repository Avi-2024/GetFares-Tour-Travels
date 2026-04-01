BEGIN;

ALTER TABLE followups
  ADD COLUMN IF NOT EXISTS status_snapshot VARCHAR(60);

ALTER TABLE followups
  ADD COLUMN IF NOT EXISTS counts_toward_compliance BOOLEAN DEFAULT TRUE;

UPDATE followups
SET counts_toward_compliance = TRUE
WHERE counts_toward_compliance IS NULL;

COMMENT ON COLUMN followups.status_snapshot IS
'Stores the workflow status selected by the salesperson at the time the history entry was created';

COMMENT ON COLUMN followups.counts_toward_compliance IS
'TRUE when the history row should affect follow-up compliance counters; FALSE when it is history-only';

COMMIT;
