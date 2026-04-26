CREATE TABLE IF NOT EXISTS meta_page_configs (
  id CHAR(36) NOT NULL,
  page_id VARCHAR(120) NOT NULL,
  page_name VARCHAR(150) DEFAULT NULL,
  country_id CHAR(36) DEFAULT NULL,
  country_code VARCHAR(20) DEFAULT NULL,
  source_label VARCHAR(120) NOT NULL,
  access_token TEXT DEFAULT NULL,
  app_secret VARCHAR(255) DEFAULT NULL,
  verify_token VARCHAR(255) DEFAULT NULL,
  graph_version VARCHAR(40) DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_meta_page_configs_page_id (page_id),
  KEY idx_meta_page_configs_country_active (country_id, is_active)
);

CREATE TABLE IF NOT EXISTS meta_webhook_events (
  id CHAR(36) NOT NULL,
  page_id VARCHAR(120) DEFAULT NULL,
  leadgen_id VARCHAR(120) DEFAULT NULL,
  event_key VARCHAR(255) NOT NULL,
  status VARCHAR(40) NOT NULL,
  error_code VARCHAR(120) DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  payload_json JSON DEFAULT NULL,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_meta_webhook_events_event_key (event_key),
  KEY idx_meta_webhook_events_status_received (status, received_at),
  KEY idx_meta_webhook_events_leadgen_id (leadgen_id)
);

ALTER TABLE leads
  ADD COLUMN meta_page_id VARCHAR(120) DEFAULT NULL;

ALTER TABLE leads
  ADD COLUMN meta_form_id VARCHAR(120) DEFAULT NULL;

ALTER TABLE leads
  ADD COLUMN meta_ad_id VARCHAR(120) DEFAULT NULL;

ALTER TABLE leads
  ADD COLUMN meta_adset_id VARCHAR(120) DEFAULT NULL;

ALTER TABLE leads
  ADD COLUMN meta_campaign_id VARCHAR(120) DEFAULT NULL;

CREATE INDEX idx_leads_meta_page_id ON leads(meta_page_id);
CREATE INDEX idx_leads_meta_ad_id ON leads(meta_ad_id);
CREATE INDEX idx_leads_meta_campaign_id ON leads(meta_campaign_id);
