DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'quote_status' AND e.enumlabel = 'VIEWED'
  ) THEN
    ALTER TYPE quote_status ADD VALUE 'VIEWED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'quote_status' AND e.enumlabel = 'EXPIRED'
  ) THEN
    ALTER TYPE quote_status ADD VALUE 'EXPIRED';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS quotation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  template_type VARCHAR(40) NOT NULL CHECK (template_type IN ('READY_PACKAGE', 'VISA', 'CUSTOM_ITINERARY')),
  header_branding TEXT,
  inclusions TEXT,
  exclusions TEXT,
  payment_terms TEXT,
  cancellation_policy TEXT,
  footer_disclaimer TEXT,
  min_margin_percent NUMERIC(5,2) DEFAULT 0 CHECK (min_margin_percent >= 0 AND min_margin_percent <= 100),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES quotation_templates(id) ON DELETE SET NULL;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS template_snapshot JSONB;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS quote_number VARCHAR(50);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS margin_amount NUMERIC(12,2) DEFAULT 0 CHECK (margin_amount >= 0);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0 CHECK (discount_amount >= 0);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0 CHECK (tax_amount >= 0);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS min_margin_percent NUMERIC(5,2) DEFAULT 0 CHECK (min_margin_percent >= 0 AND min_margin_percent <= 100);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS approval_note TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES users(id);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMP;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS pdf_generated_by UUID REFERENCES users(id);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS first_viewed_at TIMESTAMP;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS lead_to_quote_minutes INT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

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

ALTER TABLE quotation_views ADD COLUMN IF NOT EXISTS device_info TEXT;
ALTER TABLE quotation_views ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_quotations_quote_number ON quotations (quote_number) WHERE quote_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_template_id ON quotations(template_id);
CREATE INDEX IF NOT EXISTS idx_quotations_requires_approval ON quotations(requires_approval);
CREATE INDEX IF NOT EXISTS idx_quotations_status_expires ON quotations(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_quotation_version_logs_quote ON quotation_version_logs(quotation_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_quotation_send_logs_quote_sent_at ON quotation_send_logs(quotation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotation_reminders_quote_type ON quotation_reminder_logs(quotation_id, reminder_type);
CREATE INDEX IF NOT EXISTS idx_quotation_views_quote_viewed ON quotation_views(quotation_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotation_templates_active_type ON quotation_templates(is_active, template_type);
