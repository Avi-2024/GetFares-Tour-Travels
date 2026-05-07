CREATE TABLE IF NOT EXISTS push_subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  endpoint TEXT NOT NULL,
  endpoint_hash CHAR(64) NOT NULL,
  subscription JSON NOT NULL,
  user_agent VARCHAR(255) NULL,
  last_seen_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_push_subscriptions_user_endpoint (user_id, endpoint_hash)
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions (user_id);
CREATE INDEX idx_push_subscriptions_user_endpoint_hash ON push_subscriptions (user_id, endpoint_hash);
