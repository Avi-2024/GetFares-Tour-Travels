-- Ensure system date/time preferences are present in database-backed settings (MySQL)
-- This keeps runtime defaults and persisted DB values aligned.

-- Safety guard: if migration 008 was not applied yet, create a compatible table
-- so this migration remains idempotent and deploy-safe.
CREATE TABLE IF NOT EXISTS app_settings (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `key` VARCHAR(80) NOT NULL UNIQUE,
  value JSON NOT NULL DEFAULT (JSON_OBJECT()),
  updated_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_app_settings_key ON app_settings(`key`);

INSERT INTO app_settings (`key`, value)
VALUES (
  'system',
  JSON_OBJECT(
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
ON DUPLICATE KEY UPDATE `key` = `key`;

UPDATE app_settings
SET
  value = JSON_MERGE_PATCH(
    COALESCE(value, JSON_OBJECT()),
    JSON_OBJECT(
      'timezone', COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(value, '$.timezone')), ''), 'Asia/Kolkata'),
      'locale', COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(value, '$.locale')), ''), 'en-IN'),
      'dateFormat', COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(value, '$.dateFormat')), ''), 'DD/MM/YYYY')
    )
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE `key` = 'system';
