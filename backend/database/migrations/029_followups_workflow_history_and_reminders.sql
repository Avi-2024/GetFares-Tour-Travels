-- Follow-up workflow/history/reminder alignment
-- Safe to run on PostgreSQL environments where some earlier follow-up migrations
-- may or may not already be applied.

BEGIN;

ALTER TABLE followups
  ADD COLUMN IF NOT EXISTS cadence_code VARCHAR(50);

ALTER TABLE followups
  ADD COLUMN IF NOT EXISTS is_schedule_only BOOLEAN DEFAULT FALSE;

UPDATE followups
SET is_schedule_only = FALSE
WHERE is_schedule_only IS NULL;

CREATE INDEX IF NOT EXISTS idx_followups_lead_cadence_code
  ON followups(lead_id, cadence_code);

CREATE INDEX IF NOT EXISTS idx_followups_is_schedule_only
  ON followups(is_schedule_only);

COMMENT ON COLUMN followups.is_schedule_only IS
'TRUE = schedule-only reminder (private note, not shown in follow-up history); FALSE = workflow/compliance follow-up';

CREATE TABLE IF NOT EXISTS lead_followup_alert_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  followup_id UUID NOT NULL REFERENCES followups(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  alert_date DATE NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_followup_alert_logs_unique
  ON lead_followup_alert_logs (followup_id, alert_type, alert_date);

CREATE INDEX IF NOT EXISTS idx_lead_followup_alert_logs_alert_date
  ON lead_followup_alert_logs (alert_date);

COMMIT;

-- Optional one-time backfill:
-- Run ONLY if all old rows in `followups` came from "Schedule Follow-up"
-- and you want to hide those old notes from Follow-up History.
--
-- UPDATE followups
-- SET is_schedule_only = TRUE
-- WHERE is_schedule_only = FALSE;
