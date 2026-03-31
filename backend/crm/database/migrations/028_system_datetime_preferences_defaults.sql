-- Ensure system date/time preferences are present in database-backed settings.
-- This keeps runtime defaults and persisted DB values aligned.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Safety guard: if migration 008 was not applied yet, create a compatible table
-- so this migration remains idempotent and deploy-safe.
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(80) NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

INSERT INTO app_settings (key, value)
VALUES (
  'system',
  jsonb_build_object(
    'companyName', 'Get2Vacation Travel CRM',
    'supportEmail', 'support@Get2Vacation.com',
    'supportPhone', '',
    'timezone', 'Asia/Kolkata',
    'locale', 'en-IN',
    'currency', 'INR',
    'dateFormat', 'DD/MM/YYYY',
    'websiteUrl', ''
  )
)
ON CONFLICT (key) DO NOTHING;

UPDATE app_settings
SET
  value = COALESCE(value, '{}'::jsonb) || jsonb_build_object(
    'timezone', COALESCE(NULLIF(value->>'timezone', ''), 'Asia/Kolkata'),
    'locale', COALESCE(NULLIF(value->>'locale', ''), 'en-IN'),
    'dateFormat', COALESCE(NULLIF(value->>'dateFormat', ''), 'DD/MM/YYYY')
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE key = 'system';
