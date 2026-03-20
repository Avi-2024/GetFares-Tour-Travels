-- Settings module
-- Stores system and integration settings in JSON sections.

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(80) NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

INSERT INTO app_settings (key, value)
VALUES
  (
    'system',
    jsonb_build_object(
      'companyName', 'Get2Vacation Travel CRM',
      'supportEmail', 'support@Get2Vacation.com',
      'supportPhone', '',
      'timezone', 'Asia/Kolkata',
      'currency', 'INR',
      'dateFormat', 'DD/MM/YYYY',
      'websiteUrl', ''
    )
  ),
  (
    'integrations',
    jsonb_build_object(
      'metaAppId', '',
      'metaAccessToken', '',
      'whatsappApiToken', '',
      'smtpHost', '',
      'smtpPort', 587,
      'smtpUser', '',
      'smtpPassword', '',
      'smtpFromEmail', '',
      'webhookUrl', ''
    )
  )
ON CONFLICT (key) DO NOTHING;
