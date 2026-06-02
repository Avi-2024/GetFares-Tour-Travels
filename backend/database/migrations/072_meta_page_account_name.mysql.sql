-- Active: 1779691726347@@getfares.mysql.database.azure.com@3306@g2v
-- Track the Meta business/app account label for each connected page.

SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'meta_page_configs'
    AND COLUMN_NAME = 'account_name'
);

SET @sql := IF(
  @column_exists > 0,
  'SELECT 1',
  'ALTER TABLE meta_page_configs ADD COLUMN account_name VARCHAR(150) NULL AFTER page_name'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
