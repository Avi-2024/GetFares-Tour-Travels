-- lead_activities: wall-clock created_at + timezone (no DB default on created_at).
-- Safe if 037 was skipped: adds intermediate columns only when missing.

SET @db := DATABASE();

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'lead_activities' AND COLUMN_NAME = 'timezone'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE lead_activities ADD COLUMN timezone VARCHAR(50) NULL',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'lead_activities' AND COLUMN_NAME = 'client_created_at'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE lead_activities ADD COLUMN client_created_at VARCHAR(32) NULL',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'lead_activities' AND COLUMN_NAME = 'client_timezone'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE lead_activities ADD COLUMN client_timezone VARCHAR(80) NULL',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE lead_activities
SET
  timezone = COALESCE(NULLIF(TRIM(client_timezone), ''), 'UTC')
WHERE timezone IS NULL OR TRIM(COALESCE(timezone, '')) = '';

UPDATE lead_activities
SET
  created_at = STR_TO_DATE(NULLIF(TRIM(client_created_at), ''), '%Y-%m-%d %H:%i:%s')
WHERE client_created_at IS NOT NULL AND TRIM(client_created_at) != '';

ALTER TABLE lead_activities
  MODIFY COLUMN created_at DATETIME NOT NULL;

ALTER TABLE lead_activities
  MODIFY COLUMN timezone VARCHAR(50) NOT NULL;

ALTER TABLE lead_activities
  ALTER COLUMN created_at DROP DEFAULT;

ALTER TABLE lead_activities
  ALTER COLUMN timezone DROP DEFAULT;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'lead_activities' AND COLUMN_NAME = 'client_created_at'
);
SET @sql := IF(@exists > 0,
  'ALTER TABLE lead_activities DROP COLUMN client_created_at',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'lead_activities' AND COLUMN_NAME = 'client_timezone'
);
SET @sql := IF(@exists > 0,
  'ALTER TABLE lead_activities DROP COLUMN client_timezone',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
