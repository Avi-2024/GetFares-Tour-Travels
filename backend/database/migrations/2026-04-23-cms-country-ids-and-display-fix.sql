-- Adds multi-country support fields for CMS entities and backfills country_ids.

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'countries') = 0,
  'CREATE TABLE countries (id CHAR(36) PRIMARY KEY DEFAULT (UUID()), name VARCHAR(100) NOT NULL, code VARCHAR(10) NOT NULL UNIQUE, code_alpha2 VARCHAR(5) NOT NULL UNIQUE, flag_emoji VARCHAR(10), currency_code VARCHAR(10), currency_symbol VARCHAR(10), phone_code VARCHAR(10), is_active BOOLEAN DEFAULT TRUE, display_order INT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'landing_places' AND column_name = 'country_ids') = 0,
  'ALTER TABLE landing_places ADD COLUMN country_ids JSON NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'destinations' AND column_name = 'country_ids') = 0,
  'ALTER TABLE destinations ADD COLUMN country_ids JSON NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'main_packages' AND column_name = 'country_ids') = 0,
  'ALTER TABLE main_packages ADD COLUMN country_ids JSON NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'packages' AND column_name = 'country_ids') = 0,
  'ALTER TABLE packages ADD COLUMN country_ids JSON NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'visa_destinations' AND column_name = 'country_ids') = 0,
  'ALTER TABLE visa_destinations ADD COLUMN country_ids JSON NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'featured_picks' AND column_name = 'country_ids') = 0,
  'ALTER TABLE featured_picks ADD COLUMN country_ids JSON NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO countries (id, name, code, code_alpha2, is_active, display_order)
SELECT UUID(), src.country_name, UPPER(REPLACE(src.country_name, ' ', '_')), UPPER(LEFT(src.country_name, 2)), TRUE, 0
FROM (
  SELECT DISTINCT TRIM(country) AS country_name FROM destinations WHERE country IS NOT NULL AND TRIM(country) <> ''
  UNION
  SELECT DISTINCT TRIM(country) AS country_name FROM landing_places WHERE country IS NOT NULL AND TRIM(country) <> ''
  UNION
  SELECT DISTINCT TRIM(country) AS country_name FROM main_packages WHERE country IS NOT NULL AND TRIM(country) <> ''
  UNION
  SELECT DISTINCT TRIM(country) AS country_name FROM visa_destinations WHERE country IS NOT NULL AND TRIM(country) <> ''
  UNION
  SELECT DISTINCT TRIM(country) AS country_name FROM featured_picks WHERE country IS NOT NULL AND TRIM(country) <> ''
) src
LEFT JOIN countries c ON LOWER(c.name) = LOWER(src.country_name)
WHERE src.country_name IS NOT NULL
  AND src.country_name <> ''
  AND c.id IS NULL;

UPDATE landing_places lp
JOIN countries c ON LOWER(c.name) = LOWER(TRIM(lp.country))
SET lp.country_ids = JSON_ARRAY(c.id)
WHERE (lp.country_ids IS NULL OR JSON_LENGTH(lp.country_ids) = 0)
  AND lp.country IS NOT NULL
  AND TRIM(lp.country) <> '';

UPDATE destinations d
JOIN countries c ON LOWER(c.name) = LOWER(TRIM(d.country))
SET d.country_ids = JSON_ARRAY(c.id)
WHERE (d.country_ids IS NULL OR JSON_LENGTH(d.country_ids) = 0)
  AND d.country IS NOT NULL
  AND TRIM(d.country) <> '';

UPDATE main_packages mp
JOIN countries c ON LOWER(c.name) = LOWER(TRIM(mp.country))
SET mp.country_ids = JSON_ARRAY(c.id)
WHERE (mp.country_ids IS NULL OR JSON_LENGTH(mp.country_ids) = 0)
  AND mp.country IS NOT NULL
  AND TRIM(mp.country) <> '';

UPDATE packages p
LEFT JOIN main_packages mp ON mp.id = p.main_package_id
LEFT JOIN countries c ON LOWER(c.name) = LOWER(TRIM(COALESCE(p.destination, mp.country)))
SET p.country_ids = JSON_ARRAY(c.id)
WHERE (p.country_ids IS NULL OR JSON_LENGTH(p.country_ids) = 0)
  AND c.id IS NOT NULL;

UPDATE visa_destinations vd
JOIN countries c ON LOWER(c.name) = LOWER(TRIM(vd.country))
SET vd.country_ids = JSON_ARRAY(c.id)
WHERE (vd.country_ids IS NULL OR JSON_LENGTH(vd.country_ids) = 0)
  AND vd.country IS NOT NULL
  AND TRIM(vd.country) <> '';

UPDATE featured_picks fp
JOIN countries c ON LOWER(c.name) = LOWER(TRIM(fp.country))
SET fp.country_ids = JSON_ARRAY(c.id)
WHERE (fp.country_ids IS NULL OR JSON_LENGTH(fp.country_ids) = 0)
  AND fp.country IS NOT NULL
  AND TRIM(fp.country) <> '';
