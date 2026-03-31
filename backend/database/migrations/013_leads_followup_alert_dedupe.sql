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
