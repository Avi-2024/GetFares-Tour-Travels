ALTER TABLE refunds
  ADD COLUMN assigned_to CHAR(36) NULL AFTER payment_id;

ALTER TABLE refunds
  ADD COLUMN raised_by_name VARCHAR(150) NULL AFTER assigned_to;

ALTER TABLE refunds
  ADD COLUMN created_by CHAR(36) NULL AFTER status;

ALTER TABLE refunds
  ADD COLUMN approved_at TIMESTAMP NULL AFTER approved_by;

ALTER TABLE refunds
  ADD COLUMN rejected_at TIMESTAMP NULL AFTER approved_at;

ALTER TABLE refunds
  ADD COLUMN rejected_by CHAR(36) NULL AFTER rejected_at;

ALTER TABLE refunds
  ADD COLUMN rejected_reason TEXT NULL AFTER rejected_by;

ALTER TABLE refunds
  ADD COLUMN processed_by CHAR(36) NULL AFTER processed_at;

ALTER TABLE refunds
  ADD INDEX idx_refunds_assigned_to (assigned_to);

ALTER TABLE refunds
  ADD INDEX idx_refunds_created_by (created_by);

ALTER TABLE refunds
  ADD CONSTRAINT refunds_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE refunds
  ADD CONSTRAINT refunds_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE refunds
  ADD CONSTRAINT refunds_rejected_by_fkey
  FOREIGN KEY (rejected_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE refunds
  ADD CONSTRAINT refunds_processed_by_fkey
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL;
