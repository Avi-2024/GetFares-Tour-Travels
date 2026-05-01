SET @db := DATABASE();

SET @sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = @db
     AND table_name = 'landing_places'
     AND column_name = 'description') = 0,
  'ALTER TABLE landing_places ADD COLUMN description TEXT NULL AFTER tag',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE landing_places
SET description = tag
WHERE (description IS NULL OR TRIM(description) = '')
  AND tag IS NOT NULL
  AND TRIM(tag) <> '';
