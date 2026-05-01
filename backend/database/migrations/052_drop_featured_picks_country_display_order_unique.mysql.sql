SET @db := DATABASE();

SET @sql = IF(
  (SELECT COUNT(*)
   FROM information_schema.statistics
   WHERE table_schema = @db
     AND table_name = 'featured_picks'
     AND index_name = 'ux_featured_picks_country_display_order') > 0,
  'ALTER TABLE featured_picks DROP INDEX ux_featured_picks_country_display_order',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
