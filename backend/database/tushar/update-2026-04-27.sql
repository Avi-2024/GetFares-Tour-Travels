-- =====================================================
-- CMS UPDATE 2026-04-27
-- =====================================================

SET @db := DATABASE();

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @db
     AND table_name = 'landing_places'
     AND index_name = 'ux_landing_places_country_display_order') > 0,
  'ALTER TABLE landing_places DROP INDEX ux_landing_places_country_display_order',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
