-- Ensure users.email is indexed for auth lookup performance.
-- Safe on databases where a UNIQUE(email) key already exists.

SET @users_email_index_count := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'email'
);

SET @users_email_index_sql := IF(
  @users_email_index_count = 0,
  'CREATE INDEX idx_users_email ON users (email)',
  'SELECT ''users.email index already exists'' AS message'
);

PREPARE users_email_index_stmt FROM @users_email_index_sql;
EXECUTE users_email_index_stmt;
DEALLOCATE PREPARE users_email_index_stmt;
