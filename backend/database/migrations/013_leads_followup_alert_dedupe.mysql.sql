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
