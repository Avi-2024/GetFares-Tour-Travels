-- Active: 1776775794131@@get2vacationsprd.mysql.database.azure.com@3306@g2v
-- Fixed destination value for Meta lead mapping rules.

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'meta_lead_profiles'
    AND COLUMN_NAME = 'destination_name'
);

SET @sql := IF(
  @column_exists = 0,
  'ALTER TABLE meta_lead_profiles ADD COLUMN destination_name VARCHAR(200) NULL AFTER source_label',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
