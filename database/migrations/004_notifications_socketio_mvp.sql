CREATE TABLE IF NOT EXISTS notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(150) NOT NULL,
    channel VARCHAR(30) NOT NULL DEFAULT 'SOCKET_IO',
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    title VARCHAR(200),
    message TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_role VARCHAR(100),
    recipient_team_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
      CHECK (status IN ('PENDING', 'DELIVERED', 'READ', 'FAILED')),
    delivery_attempts INT NOT NULL DEFAULT 0 CHECK (delivery_attempts >= 0),
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    last_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_events_recipient_user
  ON notification_events (recipient_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_events_recipient_role
  ON notification_events (recipient_role, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_events_recipient_team
  ON notification_events (recipient_team_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_events_event_name
  ON notification_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_events_status
  ON notification_events (status, created_at DESC);
