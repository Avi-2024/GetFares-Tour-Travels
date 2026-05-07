-- Strict wall-clock rows: no DEFAULT CURRENT_TIMESTAMP; values come from the client only.
CREATE TABLE IF NOT EXISTS crm_fixed_time_history (
  id CHAR(36) NOT NULL PRIMARY KEY,
  created_at DATETIME NOT NULL,
  timezone VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
