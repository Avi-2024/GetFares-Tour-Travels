ALTER TABLE users
ADD COLUMN active BOOLEAN DEFAULT TRUE;

UPDATE users
SET active = TRUE
WHERE active IS NULL;

CREATE TABLE IF NOT EXISTS queued_leads (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    lead_id CHAR(36) NOT NULL,
    reason VARCHAR(100),
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE (lead_id),
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_active
  ON users(active, is_active);

CREATE INDEX idx_queued_leads_pending
  ON queued_leads(queued_at ASC, processed_at);

CREATE INDEX idx_queued_leads_lead_id
  ON queued_leads(lead_id);
