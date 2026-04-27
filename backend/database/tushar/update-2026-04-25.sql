-- =====================================================
-- CMS UPDATE 2026-04-25
-- Revert country multiselect + relax parent package order uniqueness
-- =====================================================

SET @db := DATABASE();

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @db
     AND table_name = 'landing_places'
     AND column_name = 'country_ids') > 0,
  'ALTER TABLE landing_places DROP COLUMN country_ids',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @db
     AND table_name = 'destinations'
     AND column_name = 'country_ids') > 0,
  'ALTER TABLE destinations DROP COLUMN country_ids',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @db
     AND table_name = 'main_packages'
     AND column_name = 'country_ids') > 0,
  'ALTER TABLE main_packages DROP COLUMN country_ids',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @db
     AND table_name = 'packages'
     AND column_name = 'country_ids') > 0,
  'ALTER TABLE packages DROP COLUMN country_ids',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @db
     AND table_name = 'visa_destinations'
     AND column_name = 'country_ids') > 0,
  'ALTER TABLE visa_destinations DROP COLUMN country_ids',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @db
     AND table_name = 'featured_picks'
     AND column_name = 'country_ids') > 0,
  'ALTER TABLE featured_picks DROP COLUMN country_ids',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @db
     AND table_name = 'main_packages'
     AND index_name = 'ux_main_packages_country_display_order') > 0,
  'ALTER TABLE main_packages DROP INDEX ux_main_packages_country_display_order',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

