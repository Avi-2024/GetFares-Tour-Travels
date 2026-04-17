-- update-2026-04-16.sql
-- CMS packages model refactor
-- main_packages independent
-- packages table used for sub packages

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'packages'
     AND column_name = 'main_package_id') = 0,
  'ALTER TABLE packages ADD COLUMN main_package_id CHAR(36) NULL AFTER id',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'packages'
     AND column_name = 'title') = 0,
  'ALTER TABLE packages ADD COLUMN title VARCHAR(200) NULL AFTER name',
  'SELECT 1'
);

PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'packages'
     AND column_name = 'image') = 0,
  'ALTER TABLE packages ADD COLUMN image TEXT NULL AFTER banner_image_url',
  'SELECT 1'
);

PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'packages'
     AND column_name = 'rating') = 0,
  'ALTER TABLE packages ADD COLUMN rating DECIMAL(4,2) NOT NULL DEFAULT 0 AFTER image',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'packages'
     AND column_name = 'location') = 0,
  'ALTER TABLE packages ADD COLUMN location VARCHAR(200) NULL AFTER rating',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'packages'
     AND column_name = 'duration_days') = 0,
  'ALTER TABLE packages ADD COLUMN duration_days INT NOT NULL DEFAULT 0 AFTER location',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'packages'
     AND column_name = 'duration_nights') = 0,
  'ALTER TABLE packages ADD COLUMN duration_nights INT NOT NULL DEFAULT 0 AFTER duration_days',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'packages'
     AND column_name = 'transport') = 0,
  'ALTER TABLE packages ADD COLUMN transport VARCHAR(120) NULL AFTER duration_nights',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'packages'
     AND column_name = 'description') = 0,
  'ALTER TABLE packages ADD COLUMN description TEXT NULL AFTER transport',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'packages'
     AND column_name = 'snapshot') = 0,
  'ALTER TABLE packages ADD COLUMN snapshot TEXT NULL AFTER description',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'packages'
     AND column_name = 'features') = 0,
  'ALTER TABLE packages ADD COLUMN features JSON NULL AFTER snapshot',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'packages'
     AND column_name = 'itineraries') = 0,
  'ALTER TABLE packages ADD COLUMN itineraries JSON NULL AFTER features',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'packages'
     AND column_name = 'highlights') = 0,
  'ALTER TABLE packages ADD COLUMN highlights JSON NULL AFTER itineraries',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'packages'
     AND column_name = 'payment_terms') = 0,
  'ALTER TABLE packages ADD COLUMN payment_terms JSON NULL AFTER highlights',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'packages'
     AND column_name = 'tnc') = 0,
  'ALTER TABLE packages ADD COLUMN tnc JSON NULL AFTER payment_terms',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'packages'
     AND column_name = 'imp_notes') = 0,
  'ALTER TABLE packages ADD COLUMN imp_notes JSON NULL AFTER tnc',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'packages'
     AND column_name = 'display_order') = 0,
  'ALTER TABLE packages ADD COLUMN display_order INT NOT NULL DEFAULT 0 AFTER imp_notes',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'main_packages'
     AND column_name = 'title') = 0,
  'ALTER TABLE main_packages ADD COLUMN title VARCHAR(200) NULL AFTER country',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'main_packages'
     AND column_name = 'amount') = 0,
  'ALTER TABLE main_packages ADD COLUMN amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER title',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'main_packages'
     AND column_name = 'amount'
     AND DATA_TYPE <> 'decimal') = 1,
  'ALTER TABLE main_packages MODIFY COLUMN amount DECIMAL(12,2) NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'main_packages'
     AND column_name = 'features') = 0,
  'ALTER TABLE main_packages ADD COLUMN features JSON NULL AFTER amount',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'main_packages'
     AND column_name = 'inclusions') = 0,
  'ALTER TABLE main_packages ADD COLUMN inclusions JSON NULL AFTER features',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'main_packages'
     AND column_name = 'meta_title') = 0,
  'ALTER TABLE main_packages ADD COLUMN meta_title VARCHAR(180) NULL AFTER inclusions',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'main_packages'
     AND column_name = 'meta_description') = 0,
  'ALTER TABLE main_packages ADD COLUMN meta_description TEXT NULL AFTER meta_title',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'main_packages'
     AND column_name = 'keywords') = 0,
  'ALTER TABLE main_packages ADD COLUMN keywords TEXT NULL AFTER meta_description',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'main_packages'
     AND column_name = 'is_deleted') = 0,
  'ALTER TABLE main_packages ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 AFTER is_featured',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'main_packages'
     AND column_name = 'destination_id') = 0,
  'ALTER TABLE main_packages ADD COLUMN destination_id CHAR(36) NULL AFTER package_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'main_packages'
     AND column_name = 'package_id') = 1
  AND
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'packages'
     AND column_name = 'starting_price') = 1,
  'UPDATE main_packages mp
   LEFT JOIN packages p ON p.id = mp.package_id
   SET
     mp.title = COALESCE(NULLIF(mp.title, ''''), NULLIF(p.name, ''''), ''Main Package''),
     mp.amount = COALESCE(mp.amount, p.starting_price, 0)
   WHERE mp.title IS NULL OR mp.title = '''' OR mp.amount IS NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @main_fk_drop = (
  SELECT GROUP_CONCAT(DISTINCT CONCAT('DROP FOREIGN KEY `', kcu.CONSTRAINT_NAME, '`') SEPARATOR ', ')
  FROM information_schema.KEY_COLUMN_USAGE kcu
  WHERE kcu.TABLE_SCHEMA = DATABASE()
    AND kcu.TABLE_NAME = 'main_packages'
    AND kcu.COLUMN_NAME = 'package_id'
    AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
);

SET @sql = IF(
  @main_fk_drop IS NOT NULL AND LENGTH(@main_fk_drop) > 0,
  CONCAT('ALTER TABLE main_packages ', @main_fk_drop),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @main_idx_drop = (
  SELECT GROUP_CONCAT(DISTINCT CONCAT('DROP INDEX `', s.INDEX_NAME, '`') SEPARATOR ', ')
  FROM information_schema.STATISTICS s
  WHERE s.TABLE_SCHEMA = DATABASE()
    AND s.TABLE_NAME = 'main_packages'
    AND s.COLUMN_NAME = 'package_id'
    AND s.INDEX_NAME <> 'PRIMARY'
);

SET @sql = IF(
  @main_idx_drop IS NOT NULL AND LENGTH(@main_idx_drop) > 0,
  CONCAT('ALTER TABLE main_packages ', @main_idx_drop),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'main_packages'
     AND column_name = 'package_id') = 1,
  'ALTER TABLE main_packages DROP COLUMN package_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = DATABASE()
     AND table_name = 'sub_packages') = 1,
  'INSERT INTO packages (
      id, main_package_id, name, title, destination, duration,
      starting_price, inclusions, exclusions, cancellation_policy,
      package_category, status, banner_image_url, image,
      meta_title, meta_description, keywords,
      is_deleted, created_at, updated_at,
      rating, location, duration_days, duration_nights,
      transport, description, snapshot,
      features, itineraries, highlights,
      payment_terms, tnc, imp_notes,
      display_order
    )
    SELECT
      sp.id,
      sp.main_package_id,
      COALESCE(NULLIF(psrc.name, ''''), ''Sub Package''),
      COALESCE(NULLIF(psrc.name, ''''), ''Sub Package''),
      COALESCE(NULLIF(psrc.destination, ''''), NULLIF(d.name, ''''), ''Unknown''),
      psrc.duration,
      COALESCE(psrc.starting_price, 0),
      psrc.inclusions,
      psrc.exclusions,
      psrc.cancellation_policy,
      ''sub'',
      COALESCE(psrc.status, ''DRAFT''),
      psrc.banner_image_url,
      psrc.banner_image_url,
      psrc.meta_title,
      psrc.meta_description,
      psrc.keywords,
      COALESCE(sp.is_deleted, psrc.is_deleted, 0),
      COALESCE(sp.created_at, psrc.created_at, CURRENT_TIMESTAMP),
      COALESCE(sp.updated_at, psrc.updated_at, CURRENT_TIMESTAMP),
      0,
      NULL,
      0,
      0,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      COALESCE(sp.display_order, 0)
    FROM sub_packages sp
    LEFT JOIN main_packages mp ON mp.id = sp.main_package_id
    LEFT JOIN destinations d ON d.id = mp.destination_id
    LEFT JOIN packages psrc ON psrc.id = sp.package_id
    LEFT JOIN packages p ON p.id = sp.id
    WHERE p.id IS NULL AND psrc.id IS NOT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = DATABASE()
     AND TABLE_NAME = 'packages'
     AND CONSTRAINT_NAME = 'fk_packages_main_package') = 0
  AND
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'packages'
     AND column_name = 'main_package_id') = 1,
  'ALTER TABLE packages ADD CONSTRAINT fk_packages_main_package FOREIGN KEY (main_package_id) REFERENCES main_packages(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = DATABASE()
     AND table_name = 'packages'
     AND index_name = 'idx_packages_main_package') = 0,
  'CREATE INDEX idx_packages_main_package ON packages(main_package_id, is_deleted, display_order)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = DATABASE()
     AND table_name = 'destination_package_map') = 1,
  'DROP TABLE destination_package_map',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = DATABASE()
     AND table_name = 'sub_packages') = 1,
  'DROP TABLE sub_packages',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
