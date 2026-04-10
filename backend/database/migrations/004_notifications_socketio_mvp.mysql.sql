CREATE TABLE IF NOT EXISTS notification_events (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    event_name VARCHAR(150) NOT NULL,
    channel VARCHAR(30) NOT NULL DEFAULT 'SOCKET_IO',
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    title VARCHAR(200),
    message TEXT,
    payload JSON NOT NULL DEFAULT (JSON_OBJECT()),
    recipient_user_id CHAR(36),
    recipient_role VARCHAR(100),
    recipient_team_id CHAR(36),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
      CHECK (status IN ('PENDING', 'DELIVERED', 'READ', 'FAILED')),
    delivery_attempts INT NOT NULL DEFAULT 0 CHECK (delivery_attempts >= 0),
    delivered_at TIMESTAMP NULL,
    read_at TIMESTAMP NULL,
    last_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_notification_events_recipient_user
  ON notification_events (recipient_user_id, status, created_at DESC);

CREATE INDEX idx_notification_events_recipient_role
  ON notification_events (recipient_role, status, created_at DESC);

CREATE INDEX idx_notification_events_recipient_team
  ON notification_events (recipient_team_id, status, created_at DESC);

CREATE INDEX idx_notification_events_event_name
  ON notification_events (event_name, created_at DESC);

CREATE INDEX idx_notification_events_status
  ON notification_events (status, created_at DESC);
