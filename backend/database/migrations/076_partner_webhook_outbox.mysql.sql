CREATE TABLE IF NOT EXISTS integration_webhook_endpoints (
  id CHAR(36) NOT NULL PRIMARY KEY,
  client_id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  webhook_url VARCHAR(1000) NOT NULL,
  signing_secret_encrypted TEXT NOT NULL,
  subscribed_events JSON NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_integration_webhook_client
    FOREIGN KEY (client_id) REFERENCES integration_clients(id),
  KEY idx_integration_webhook_client_active (client_id, is_active)
);

ALTER TABLE integration_webhook_endpoints
  ADD COLUMN name VARCHAR(150) NOT NULL DEFAULT 'Client CRM Webhook';

ALTER TABLE integration_webhook_endpoints
  ADD COLUMN signing_secret_encrypted TEXT NULL;

ALTER TABLE integration_webhook_endpoints
  ADD COLUMN subscribed_events JSON NULL;

ALTER TABLE integration_webhook_endpoints
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

UPDATE integration_webhook_endpoints
SET subscribed_events = JSON_ARRAY('*')
WHERE subscribed_events IS NULL;

CREATE TABLE IF NOT EXISTS integration_webhook_deliveries (
  id CHAR(36) NOT NULL PRIMARY KEY,
  event_id CHAR(36) NOT NULL,
  endpoint_id CHAR(36) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id CHAR(36) NOT NULL,
  root_booking_id CHAR(36) NULL,
  payload JSON NOT NULL,
  status ENUM('PENDING','PROCESSING','DELIVERED','FAILED') NOT NULL DEFAULT 'PENDING',
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivered_at DATETIME NULL,
  last_attempt_at DATETIME NULL,
  last_http_status INT NULL,
  last_error TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_integration_delivery_endpoint
    FOREIGN KEY (endpoint_id) REFERENCES integration_webhook_endpoints(id),
  UNIQUE KEY uq_integration_delivery_event_endpoint (event_id, endpoint_id),
  KEY idx_integration_delivery_worker (status, next_attempt_at, created_at),
  KEY idx_integration_delivery_endpoint (endpoint_id, created_at)
);

UPDATE integration_clients
SET scopes = JSON_ARRAY_APPEND(scopes, '$', 'webhooks:manage')
WHERE JSON_CONTAINS(scopes, JSON_QUOTE('webhooks:manage')) = 0;

UPDATE integration_clients
SET scopes = JSON_ARRAY_APPEND(scopes, '$', 'deliveries:read')
WHERE JSON_CONTAINS(scopes, JSON_QUOTE('deliveries:read')) = 0;

UPDATE integration_clients
SET scopes = JSON_ARRAY_APPEND(scopes, '$', 'deliveries:retry')
WHERE JSON_CONTAINS(scopes, JSON_QUOTE('deliveries:retry')) = 0;
