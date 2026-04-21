-- =====================================================
-- CMS UPDATE 2026-04-21
-- destinations media payload + display_order uniqueness
-- =====================================================

SET @db := DATABASE();

-- 1) destinations media shape columns
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @db AND table_name = 'destinations' AND column_name = 'title_image_url') = 0,
  'ALTER TABLE destinations ADD COLUMN title_image_url TEXT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @db AND table_name = 'destinations' AND column_name = 'media') = 0,
  'ALTER TABLE destinations ADD COLUMN media JSON NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE destinations
SET media = JSON_OBJECT(
  'title_image', COALESCE(NULLIF(title_image_url, ''), NULLIF(thumbnail_url, ''), NULLIF(hero_image_url, '')),
  'gallery', JSON_ARRAY()
)
WHERE media IS NULL OR JSON_TYPE(media) <> 'OBJECT';

UPDATE destinations
SET title_image_url = JSON_UNQUOTE(JSON_EXTRACT(media, '$.title_image'))
WHERE (title_image_url IS NULL OR title_image_url = '')
  AND JSON_UNQUOTE(JSON_EXTRACT(media, '$.title_image')) IS NOT NULL;

-- 2) normalize duplicate display_order values before unique indexes

-- landing_places: unique display_order per country
SET @rownum := 0;
SET @grp := '';
UPDATE landing_places lp
JOIN (
  SELECT id, country,
         (@rownum := IF(@grp = COALESCE(country,''), @rownum + 1, 1)) AS rn,
         (@grp := COALESCE(country,'')) AS grp_marker
  FROM landing_places
  WHERE is_deleted = 0
  ORDER BY COALESCE(country,''), display_order, created_at, id
) x ON x.id = lp.id
SET lp.display_order = x.rn
WHERE lp.is_deleted = 0;

-- destination_media: unique display_order per destination
SET @rownum := 0;
SET @grp := '';
UPDATE destination_media dm
JOIN (
  SELECT id, destination_id,
         (@rownum := IF(@grp = COALESCE(destination_id,''), @rownum + 1, 1)) AS rn,
         (@grp := COALESCE(destination_id,'')) AS grp_marker
  FROM destination_media
  WHERE is_deleted = 0
  ORDER BY COALESCE(destination_id,''), display_order, created_at, id
) x ON x.id = dm.id
SET dm.display_order = x.rn
WHERE dm.is_deleted = 0;

-- season_cards: unique display_order per destination
SET @rownum := 0;
SET @grp := '';
UPDATE season_cards sc
JOIN (
  SELECT id, destination_id,
         (@rownum := IF(@grp = COALESCE(destination_id,''), @rownum + 1, 1)) AS rn,
         (@grp := COALESCE(destination_id,'')) AS grp_marker
  FROM season_cards
  WHERE is_deleted = 0
  ORDER BY COALESCE(destination_id,''), display_order, created_at, id
) x ON x.id = sc.id
SET sc.display_order = x.rn
WHERE sc.is_deleted = 0;

-- main_packages: unique display_order per country
SET @rownum := 0;
SET @grp := '';
UPDATE main_packages mp
JOIN (
  SELECT id, country,
         (@rownum := IF(@grp = COALESCE(country,''), @rownum + 1, 1)) AS rn,
         (@grp := COALESCE(country,'')) AS grp_marker
  FROM main_packages
  WHERE is_deleted = 0
  ORDER BY COALESCE(country,''), display_order, created_at, id
) x ON x.id = mp.id
SET mp.display_order = x.rn
WHERE mp.is_deleted = 0;

-- sub_packages: unique display_order per main_package_id
SET @rownum := 0;
SET @grp := '';
UPDATE sub_packages sp
JOIN (
  SELECT id, main_package_id,
         (@rownum := IF(@grp = COALESCE(main_package_id,''), @rownum + 1, 1)) AS rn,
         (@grp := COALESCE(main_package_id,'')) AS grp_marker
  FROM sub_packages
  WHERE is_deleted = 0
  ORDER BY COALESCE(main_package_id,''), display_order, created_at, id
) x ON x.id = sp.id
SET sp.display_order = x.rn
WHERE sp.is_deleted = 0;

-- visa_destinations: unique display_order per country
SET @rownum := 0;
SET @grp := '';
UPDATE visa_destinations vd
JOIN (
  SELECT id, country,
         (@rownum := IF(@grp = COALESCE(country,''), @rownum + 1, 1)) AS rn,
         (@grp := COALESCE(country,'')) AS grp_marker
  FROM visa_destinations
  WHERE is_deleted = 0
  ORDER BY COALESCE(country,''), display_order, created_at, id
) x ON x.id = vd.id
SET vd.display_order = x.rn
WHERE vd.is_deleted = 0;

-- featured_picks: unique display_order per country
SET @rownum := 0;
SET @grp := '';
UPDATE featured_picks fp
JOIN (
  SELECT id, country,
         (@rownum := IF(@grp = COALESCE(country,''), @rownum + 1, 1)) AS rn,
         (@grp := COALESCE(country,'')) AS grp_marker
  FROM featured_picks
  WHERE is_deleted = 0
  ORDER BY COALESCE(country,''), display_order, created_at, id
) x ON x.id = fp.id
SET fp.display_order = x.rn
WHERE fp.is_deleted = 0;

-- 3) add unique indexes for display_order scopes
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @db AND table_name = 'landing_places' AND index_name = 'ux_landing_places_country_display_order') = 0,
  'CREATE UNIQUE INDEX ux_landing_places_country_display_order ON landing_places(country, display_order)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @db AND table_name = 'destination_media' AND index_name = 'ux_destination_media_destination_display_order') = 0,
  'CREATE UNIQUE INDEX ux_destination_media_destination_display_order ON destination_media(destination_id, display_order)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @db AND table_name = 'season_cards' AND index_name = 'ux_season_cards_destination_display_order') = 0,
  'CREATE UNIQUE INDEX ux_season_cards_destination_display_order ON season_cards(destination_id, display_order)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @db AND table_name = 'main_packages' AND index_name = 'ux_main_packages_country_display_order') = 0,
  'CREATE UNIQUE INDEX ux_main_packages_country_display_order ON main_packages(country, display_order)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @db AND table_name = 'sub_packages' AND index_name = 'ux_sub_packages_main_display_order') = 0,
  'CREATE UNIQUE INDEX ux_sub_packages_main_display_order ON sub_packages(main_package_id, display_order)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @db AND table_name = 'visa_destinations' AND index_name = 'ux_visa_destinations_country_display_order') = 0,
  'CREATE UNIQUE INDEX ux_visa_destinations_country_display_order ON visa_destinations(country, display_order)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @db AND table_name = 'featured_picks' AND index_name = 'ux_featured_picks_country_display_order') = 0,
  'CREATE UNIQUE INDEX ux_featured_picks_country_display_order ON featured_picks(country, display_order)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
