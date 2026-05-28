ALTER TABLE meta_page_configs
  ADD COLUMN country_name VARCHAR(150) DEFAULT NULL AFTER country_code,
  ADD COLUMN graph_base_url VARCHAR(255) DEFAULT NULL AFTER graph_version,
  ADD COLUMN graph_fields TEXT DEFAULT NULL AFTER graph_base_url,
  ADD COLUMN secrets_confirmed_at TIMESTAMP NULL DEFAULT NULL AFTER verify_token;

ALTER TABLE meta_page_configs
  ADD COLUMN graph_version VARCHAR(40) DEFAULT NULL AFTER verify_token;

CREATE TABLE IF NOT EXISTS meta_integration_settings (
  id VARCHAR(40) NOT NULL DEFAULT 'default',
  app_secret TEXT DEFAULT NULL,
  verify_token TEXT DEFAULT NULL,
  graph_base_url VARCHAR(255) DEFAULT NULL,
  graph_version VARCHAR(40) DEFAULT NULL,
  graph_fields TEXT DEFAULT NULL,
  allow_insecure_webhooks BOOLEAN NOT NULL DEFAULT FALSE,
  secrets_confirmed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

INSERT IGNORE INTO meta_integration_settings (id) VALUES ('default');
