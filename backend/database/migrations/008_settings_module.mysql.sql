-- Settings module (MySQL)
-- Stores system and integration settings in JSON sections.

CREATE TABLE IF NOT EXISTS app_settings (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `key` VARCHAR(80) NOT NULL UNIQUE,
  value JSON NOT NULL DEFAULT (JSON_OBJECT()),
  updated_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_app_settings_key ON app_settings(`key`);

INSERT INTO app_settings (`key`, value)
VALUES
  (
    'system',
    JSON_OBJECT(
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
    JSON_OBJECT(
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
ON DUPLICATE KEY UPDATE `key` = `key`;
