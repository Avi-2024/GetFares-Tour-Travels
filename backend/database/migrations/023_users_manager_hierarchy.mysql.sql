-- Add reporting hierarchy link for agents (MySQL)
ALTER TABLE users
  ADD COLUMN manager_id CHAR(36);

ALTER TABLE users
  ADD CONSTRAINT fk_users_manager
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_users_manager_id ON users(manager_id);
