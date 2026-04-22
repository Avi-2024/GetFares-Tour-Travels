-- CMS incremental update: 2026-04-15
-- 1) Destinations multi-select support
-- 2) Visa destination price fields

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'destinations'
     AND column_name = 'categories') = 0,
  'ALTER TABLE destinations ADD COLUMN categories JSON NULL AFTER category',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'destinations'
     AND column_name = 'season_focus') = 0,
  'ALTER TABLE destinations ADD COLUMN season_focus JSON NULL AFTER season',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'visa_destinations'
     AND column_name = 'price_currency') = 0,
  'ALTER TABLE visa_destinations ADD COLUMN price_currency VARCHAR(10) NULL AFTER image_url',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'visa_destinations'
     AND column_name = 'price_amount') = 0,
  'ALTER TABLE visa_destinations ADD COLUMN price_amount DECIMAL(12,2) NULL AFTER price_currency',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
