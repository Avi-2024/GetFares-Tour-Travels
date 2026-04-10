-- Module completion migration: automation scheduler + bookings structured deadlines + alert logs (MySQL)

ALTER TABLE bookings
  ADD COLUMN supplier_details JSON DEFAULT (JSON_OBJECT()),
  ADD COLUMN dmc_details JSON DEFAULT (JSON_OBJECT()),
  ADD COLUMN hotel_segments JSON DEFAULT (JSON_ARRAY()),
  ADD COLUMN flight_segments JSON DEFAULT (JSON_ARRAY()),
  ADD COLUMN insurance_details JSON DEFAULT (JSON_OBJECT()),
  ADD COLUMN other_services JSON DEFAULT (JSON_ARRAY()),
  ADD COLUMN blocking_deadline_at TIMESTAMP NULL,
  ADD COLUMN supplier_payment_deadline_at TIMESTAMP NULL,
  ADD COLUMN cancellation_deadline_at TIMESTAMP NULL,
  ADD COLUMN balance_due_by TIMESTAMP NULL,
  ADD COLUMN deadline_risk_level VARCHAR(20) DEFAULT 'SAFE',
  ADD COLUMN deadline_last_evaluated_at TIMESTAMP NULL;

ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_deadline_risk_level
  CHECK (deadline_risk_level IN ('SAFE', 'D2_DUE', 'DEADLINE_DUE', 'OVERDUE'));

CREATE INDEX idx_bookings_supplier_deadline
  ON bookings (supplier_payment_deadline_at);

CREATE INDEX idx_bookings_cancellation_deadline
  ON bookings (cancellation_deadline_at);

CREATE INDEX idx_bookings_deadline_risk_level
  ON bookings (deadline_risk_level);

CREATE TABLE IF NOT EXISTS booking_reminder_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  booking_id CHAR(36) NOT NULL,
  reminder_type VARCHAR(60) NOT NULL,
  scheduled_for DATE NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSON DEFAULT (JSON_OBJECT()),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_booking_reminder_logs_booking_type_date
  ON booking_reminder_logs (booking_id, reminder_type, scheduled_for);

CREATE INDEX idx_booking_reminder_logs_scheduled_for
  ON booking_reminder_logs (scheduled_for);

CREATE TABLE IF NOT EXISTS booking_deadline_alert_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  booking_id CHAR(36) NOT NULL,
  alert_type VARCHAR(80) NOT NULL,
  alert_date DATE NOT NULL,
  triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSON DEFAULT (JSON_OBJECT()),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_booking_deadline_alert_logs_unique
  ON booking_deadline_alert_logs (booking_id, alert_type, alert_date);

CREATE INDEX idx_booking_deadline_alert_logs_alert_date
  ON booking_deadline_alert_logs (alert_date);

CREATE TABLE IF NOT EXISTS supplier_payable_alert_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  payable_id CHAR(36) NOT NULL,
  alert_type VARCHAR(80) NOT NULL,
  alert_date DATE NOT NULL,
  triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSON DEFAULT (JSON_OBJECT()),
  FOREIGN KEY (payable_id) REFERENCES supplier_payables(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_supplier_payable_alert_logs_unique
  ON supplier_payable_alert_logs (payable_id, alert_type, alert_date);

CREATE INDEX idx_supplier_payable_alert_logs_alert_date
  ON supplier_payable_alert_logs (alert_date);

CREATE INDEX idx_supplier_payables_due_date
  ON supplier_payables (due_date);

CREATE TABLE IF NOT EXISTS automation_job_runs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  job_name VARCHAR(120) NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
  records_processed INT NOT NULL DEFAULT 0,
  details JSON DEFAULT (JSON_OBJECT()),
  lock_owner VARCHAR(120),
  error_message TEXT
);

ALTER TABLE automation_job_runs
  ADD CONSTRAINT chk_automation_job_runs_status
  CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED'));

CREATE INDEX idx_automation_job_runs_job_started
  ON automation_job_runs (job_name, started_at DESC);
