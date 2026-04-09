-- MySQL migration: quotation engine sprint 3
-- This migration is idempotent and safe for re-run in environments where
-- some columns/tables may already exist.

CREATE TABLE IF NOT EXISTS quotation_templates (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  template_type VARCHAR(40) NOT NULL
    CHECK (template_type IN ('READY_PACKAGE', 'VISA', 'CUSTOM_ITINERARY')),
  header_branding TEXT,
  inclusions TEXT,
  exclusions TEXT,
  payment_terms TEXT,
  cancellation_policy TEXT,
  footer_disclaimer TEXT,
  min_margin_percent DECIMAL(5,2) DEFAULT 0
    CHECK (min_margin_percent >= 0 AND min_margin_percent <= 100),
  is_active BOOLEAN DEFAULT TRUE,
  created_by CHAR(36),
  updated_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

ALTER TABLE quotations
  ADD COLUMN template_id CHAR(36),
  ADD COLUMN template_snapshot JSON,
  ADD COLUMN quote_number VARCHAR(50),
  ADD COLUMN margin_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN discount_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN tax_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN min_margin_percent DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN requires_approval BOOLEAN DEFAULT FALSE,
  ADD COLUMN approved_by CHAR(36),
  ADD COLUMN approved_at TIMESTAMP NULL,
  ADD COLUMN approval_note TEXT,
  ADD COLUMN sent_by CHAR(36),
  ADD COLUMN pdf_generated_at TIMESTAMP NULL,
  ADD COLUMN pdf_generated_by CHAR(36),
  ADD COLUMN view_count INT DEFAULT 0,
  ADD COLUMN first_viewed_at TIMESTAMP NULL,
  ADD COLUMN last_viewed_at TIMESTAMP NULL,
  ADD COLUMN expires_at TIMESTAMP NULL,
  ADD COLUMN locked_at TIMESTAMP NULL,
  ADD COLUMN lead_to_quote_minutes INT,
  ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add foreign keys if they don't exist
SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
   WHERE CONSTRAINT_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'quotations' 
   AND CONSTRAINT_NAME = 'quotations_template_id_fkey') = 0,
  'ALTER TABLE quotations ADD CONSTRAINT quotations_template_id_fkey FOREIGN KEY (template_id) REFERENCES quotation_templates(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
   WHERE CONSTRAINT_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'quotations' 
   AND CONSTRAINT_NAME = 'quotations_approved_by_fkey') = 0,
  'ALTER TABLE quotations ADD CONSTRAINT quotations_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users(id)',
  'SELECT 1'
);
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
   WHERE CONSTRAINT_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'quotations' 
   AND CONSTRAINT_NAME = 'quotations_sent_by_fkey') = 0,
  'ALTER TABLE quotations ADD CONSTRAINT quotations_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES users(id)',
  'SELECT 1'
);
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
   WHERE CONSTRAINT_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'quotations' 
   AND CONSTRAINT_NAME = 'quotations_pdf_generated_by_fkey') = 0,
  'ALTER TABLE quotations ADD CONSTRAINT quotations_pdf_generated_by_fkey FOREIGN KEY (pdf_generated_by) REFERENCES users(id)',
  'SELECT 1'
);
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add check constraints
ALTER TABLE quotations
  ADD CONSTRAINT chk_quotations_margin_amount_non_negative CHECK (margin_amount >= 0),
  ADD CONSTRAINT chk_quotations_discount_amount_non_negative CHECK (discount_amount >= 0),
  ADD CONSTRAINT chk_quotations_tax_amount_non_negative CHECK (tax_amount >= 0),
  ADD CONSTRAINT chk_quotations_min_margin_percent_range CHECK (min_margin_percent >= 0 AND min_margin_percent <= 100);

UPDATE quotations
SET view_count = 0
WHERE view_count IS NULL;

CREATE TABLE IF NOT EXISTS quotation_version_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  quotation_id CHAR(36) NOT NULL,
  version_number INT NOT NULL,
  editor_id CHAR(36),
  action VARCHAR(60) NOT NULL,
  change_log JSON,
  snapshot JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (editor_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS quotation_send_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  quotation_id CHAR(36) NOT NULL,
  sent_by CHAR(36),
  delivery_channel VARCHAR(30) DEFAULT 'MANUAL',
  recipient_email VARCHAR(150),
  recipient_phone VARCHAR(25),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (sent_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS quotation_reminder_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  quotation_id CHAR(36) NOT NULL,
  reminder_type VARCHAR(60) NOT NULL,
  triggered_by CHAR(36),
  triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (triggered_by) REFERENCES users(id)
);

ALTER TABLE quotation_views
  ADD COLUMN device_info TEXT,
  ADD COLUMN user_agent TEXT;

CREATE UNIQUE INDEX uq_quotations_quote_number
  ON quotations (quote_number);

CREATE INDEX idx_quotations_template_id
  ON quotations (template_id);

CREATE INDEX idx_quotations_requires_approval
  ON quotations (requires_approval);

CREATE INDEX idx_quotations_status_expires
  ON quotations (status, expires_at);

CREATE INDEX idx_quotation_version_logs_quote
  ON quotation_version_logs (quotation_id, version_number DESC);

CREATE INDEX idx_quotation_send_logs_quote_sent_at
  ON quotation_send_logs (quotation_id, sent_at DESC);

CREATE INDEX idx_quotation_reminders_quote_type
  ON quotation_reminder_logs (quotation_id, reminder_type);

CREATE INDEX idx_quotation_views_quote_viewed
  ON quotation_views (quotation_id, viewed_at DESC);

CREATE INDEX idx_quotation_templates_active_type
  ON quotation_templates (is_active, template_type);
