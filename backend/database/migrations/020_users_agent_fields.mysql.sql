-- Add agent_country and agent_type columns to users table (MySQL)
ALTER TABLE users ADD COLUMN agent_country VARCHAR(100);
ALTER TABLE users ADD COLUMN agent_type VARCHAR(50);

CREATE INDEX idx_users_agent_country
  ON users(agent_country);

CREATE INDEX idx_users_agent_type
  ON users(agent_type);
