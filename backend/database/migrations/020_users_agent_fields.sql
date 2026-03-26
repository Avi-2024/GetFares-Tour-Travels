-- Add agent_country and agent_type columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_country VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_type VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_users_agent_country
  ON users(agent_country) WHERE agent_country IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_agent_type
  ON users(agent_type) WHERE agent_type IS NOT NULL;
