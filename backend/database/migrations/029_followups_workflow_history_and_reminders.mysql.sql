-- Follow-up workflow/history/reminder alignment (MySQL)
-- Safe to run on MySQL environments where some earlier follow-up migrations
-- may or may not already be applied.

START TRANSACTION;

ALTER TABLE followups
  ADD COLUMN cadence_code VARCHAR(50);

ALTER TABLE followups
  ADD COLUMN is_schedule_only BOOLEAN DEFAULT FALSE;

UPDATE followups
SET is_schedule_only = FALSE
WHERE is_schedule_only IS NULL;

CREATE INDEX idx_followups_lead_cadence_code
  ON followups(lead_id, cadence_code);

CREATE INDEX idx_followups_is_schedule_only
  ON followups(is_schedule_only);

CREATE TABLE IF NOT EXISTS lead_followup_alert_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  followup_id CHAR(36) NOT NULL,
  alert_type TEXT NOT NULL,
  alert_date DATE NOT NULL,
  triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
  FOREIGN KEY (followup_id) REFERENCES followups(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_lead_followup_alert_logs_unique
  ON lead_followup_alert_logs (followup_id, alert_type(100), alert_date);

CREATE INDEX idx_lead_followup_alert_logs_alert_date
  ON lead_followup_alert_logs (alert_date);

COMMIT;

-- Optional one-time backfill:
-- Run ONLY if all old rows in `followups` came from "Schedule Follow-up"
-- and you want to hide those old notes from Follow-up History.
--
-- UPDATE followups
-- SET is_schedule_only = TRUE
-- WHERE is_schedule_only = FALSE;
