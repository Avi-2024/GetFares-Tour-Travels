-- Active: 1779691726347@@getfares.mysql.database.azure.com@3306@g2v
-- Allow same destination display name in multiple CMS country contexts.
-- Slug remains unique, so public destination URLs stay unambiguous.

SET @idx := (
  SELECT INDEX_NAME
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'destinations'
    AND COLUMN_NAME = 'name'
    AND NON_UNIQUE = 0
  GROUP BY INDEX_NAME
  HAVING COUNT(*) = 1
  LIMIT 1
);

SET @sql := IF(
  @idx IS NULL,
  'SELECT 1',
  CONCAT('ALTER TABLE destinations DROP INDEX `', REPLACE(@idx, '`', '``'), '`')
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
