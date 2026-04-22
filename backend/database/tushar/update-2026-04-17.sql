-- update-2026-04-17.sql
-- currency + package content + destination title image alignment

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'packages'
     AND column_name = 'starting_price_currency') = 0,
  'ALTER TABLE packages ADD COLUMN starting_price_currency VARCHAR(10) NOT NULL DEFAULT ''INR'' AFTER starting_price',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'main_packages'
     AND column_name = 'amount_currency') = 0,
  'ALTER TABLE main_packages ADD COLUMN amount_currency VARCHAR(10) NOT NULL DEFAULT ''INR'' AFTER amount',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'main_packages'
     AND column_name = 'description') = 0,
  'ALTER TABLE main_packages ADD COLUMN description TEXT NULL AFTER country',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'main_packages'
     AND column_name = 'highlights') = 0,
  'ALTER TABLE main_packages ADD COLUMN highlights JSON NULL AFTER description',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'featured_picks'
     AND column_name = 'offer_currency') = 0,
  'ALTER TABLE featured_picks ADD COLUMN offer_currency VARCHAR(10) NOT NULL DEFAULT ''INR'' AFTER badge_text',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'destinations'
     AND column_name = 'title_image_url') = 0,
  'ALTER TABLE destinations ADD COLUMN title_image_url TEXT NULL AFTER hero_image_url',
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
