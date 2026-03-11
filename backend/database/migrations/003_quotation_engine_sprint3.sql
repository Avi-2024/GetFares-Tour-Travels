-- PostgreSQL migration: quotation engine sprint 3
-- This migration is idempotent and safe for re-run in environments where
-- some columns/tables may already exist.

CREATE TABLE IF NOT EXISTS quotation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  min_margin_percent NUMERIC(5,2) DEFAULT 0
    CHECK (min_margin_percent >= 0 AND min_margin_percent <= 100),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS template_id UUID,
  ADD COLUMN IF NOT EXISTS template_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS quote_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS margin_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_margin_percent NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS approval_note TEXT,
  ADD COLUMN IF NOT EXISTS sent_by UUID,
  ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS pdf_generated_by UUID,
  ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_viewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS lead_to_quote_minutes INT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'quotations_template_id_fkey'
  ) THEN
    ALTER TABLE quotations
      ADD CONSTRAINT quotations_template_id_fkey
      FOREIGN KEY (template_id) REFERENCES quotation_templates(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'quotations_approved_by_fkey'
  ) THEN
    ALTER TABLE quotations
      ADD CONSTRAINT quotations_approved_by_fkey
      FOREIGN KEY (approved_by) REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'quotations_sent_by_fkey'
  ) THEN
    ALTER TABLE quotations
      ADD CONSTRAINT quotations_sent_by_fkey
      FOREIGN KEY (sent_by) REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'quotations_pdf_generated_by_fkey'
  ) THEN
    ALTER TABLE quotations
      ADD CONSTRAINT quotations_pdf_generated_by_fkey
      FOREIGN KEY (pdf_generated_by) REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_quotations_margin_amount_non_negative'
  ) THEN
    ALTER TABLE quotations
      ADD CONSTRAINT chk_quotations_margin_amount_non_negative
      CHECK (margin_amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_quotations_discount_amount_non_negative'
  ) THEN
    ALTER TABLE quotations
      ADD CONSTRAINT chk_quotations_discount_amount_non_negative
      CHECK (discount_amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_quotations_tax_amount_non_negative'
  ) THEN
    ALTER TABLE quotations
      ADD CONSTRAINT chk_quotations_tax_amount_non_negative
      CHECK (tax_amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_quotations_min_margin_percent_range'
  ) THEN
    ALTER TABLE quotations
      ADD CONSTRAINT chk_quotations_min_margin_percent_range
      CHECK (min_margin_percent >= 0 AND min_margin_percent <= 100);
  END IF;
END $$;

UPDATE quotations
SET view_count = 0
WHERE view_count IS NULL;

CREATE TABLE IF NOT EXISTS quotation_version_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  editor_id UUID REFERENCES users(id),
  action VARCHAR(60) NOT NULL,
  change_log JSONB,
  snapshot JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotation_send_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  sent_by UUID REFERENCES users(id),
  delivery_channel VARCHAR(30) DEFAULT 'MANUAL',
  recipient_email VARCHAR(150),
  recipient_phone VARCHAR(25),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS quotation_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  reminder_type VARCHAR(60) NOT NULL,
  triggered_by UUID REFERENCES users(id),
  triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

ALTER TABLE quotation_views
  ADD COLUMN IF NOT EXISTS device_info TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_quotations_quote_number
  ON quotations (quote_number)
  WHERE quote_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quotations_template_id
  ON quotations (template_id);

CREATE INDEX IF NOT EXISTS idx_quotations_requires_approval
  ON quotations (requires_approval);

CREATE INDEX IF NOT EXISTS idx_quotations_status_expires
  ON quotations (status, expires_at);

CREATE INDEX IF NOT EXISTS idx_quotation_version_logs_quote
  ON quotation_version_logs (quotation_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_quotation_send_logs_quote_sent_at
  ON quotation_send_logs (quotation_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotation_reminders_quote_type
  ON quotation_reminder_logs (quotation_id, reminder_type);

CREATE INDEX IF NOT EXISTS idx_quotation_views_quote_viewed
  ON quotation_views (quotation_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotation_templates_active_type
  ON quotation_templates (is_active, template_type);
