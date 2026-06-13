-- Active: 1780494193208@@getfares.cdqws6042v35.ap-south-1.rds.amazonaws.com@3306@g2v
CREATE TABLE IF NOT EXISTS integration_clients (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  api_key_hash CHAR(64) NOT NULL,
  scopes JSON NOT NULL,
  allowed_ips JSON NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_integration_clients_name (name),
  KEY idx_integration_clients_active (is_active)
);

ALTER TABLE customers
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE refunds
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

CREATE INDEX idx_customers_integration_sync ON customers(updated_at, id);
CREATE INDEX idx_leads_integration_sync ON leads(updated_at, id);
CREATE INDEX idx_customer_leads_lead_active ON customer_leads(lead_id, is_deleted, customer_id);
CREATE INDEX idx_bookings_integration_sync ON bookings(updated_at, id);
CREATE INDEX idx_payments_integration_sync ON payments(updated_at, id);
CREATE INDEX idx_refunds_integration_sync ON refunds(updated_at, id);
