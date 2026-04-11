-- ================================================
-- STEP 0: Expand visa_destinations content fields
-- ================================================

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name   = 'visa_destinations'
     AND column_name  = 'destination') = 0,
  'ALTER TABLE visa_destinations ADD COLUMN destination VARCHAR(120) AFTER country',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name   = 'visa_destinations'
     AND column_name  = 'sub_description') = 0,
  'ALTER TABLE visa_destinations ADD COLUMN sub_description TEXT AFTER slug',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name   = 'visa_destinations'
     AND column_name  = 'description_items') = 0,
  'ALTER TABLE visa_destinations ADD COLUMN description_items JSON DEFAULT (JSON_ARRAY()) AFTER description',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name   = 'visa_destinations'
     AND column_name  = 'subtitle_items') = 0,
  'ALTER TABLE visa_destinations ADD COLUMN subtitle_items JSON DEFAULT (JSON_ARRAY()) AFTER description_items',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name   = 'visa_destinations'
     AND column_name  = 'support_title') = 0,
  'ALTER TABLE visa_destinations ADD COLUMN support_title VARCHAR(200) AFTER support_info',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name   = 'visa_destinations'
     AND column_name  = 'support_description') = 0,
  'ALTER TABLE visa_destinations ADD COLUMN support_description TEXT AFTER support_title',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name   = 'visa_destinations'
     AND column_name  = 'support_list') = 0,
  'ALTER TABLE visa_destinations ADD COLUMN support_list JSON DEFAULT (JSON_ARRAY()) AFTER support_description',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE visa_destinations
SET destination = title
WHERE destination IS NULL OR TRIM(destination) = '';

UPDATE visa_destinations
SET sub_description = subtitle
WHERE (sub_description IS NULL OR TRIM(sub_description) = '')
  AND subtitle IS NOT NULL
  AND TRIM(subtitle) <> '';

UPDATE visa_destinations
SET description_items = JSON_ARRAY(description)
WHERE description IS NOT NULL
  AND TRIM(description) <> ''
  AND (description_items IS NULL OR JSON_LENGTH(description_items) = 0);

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name   = 'visa_destinations'
     AND column_name  = 'highlights') = 1,
  'UPDATE visa_destinations
   SET subtitle_items = highlights
   WHERE highlights IS NOT NULL
     AND (subtitle_items IS NULL OR JSON_LENGTH(subtitle_items) = 0)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE visa_destinations
SET support_title = 'Responsive guidance before you apply'
WHERE support_title IS NULL OR TRIM(support_title) = '';

UPDATE visa_destinations
SET support_description = support_info
WHERE (support_description IS NULL OR TRIM(support_description) = '')
  AND support_info IS NOT NULL
  AND TRIM(support_info) <> '';

-- ================================================
-- STEP 1: Expand section_type CHECK on
--         visa_destination_details to cover all
--         detail page sections
-- ================================================

-- Find and drop the existing auto-named section_type CHECK
SET @chk_name = (
  SELECT cc.CONSTRAINT_NAME
  FROM information_schema.CHECK_CONSTRAINTS cc
  JOIN information_schema.TABLE_CONSTRAINTS tc
    ON cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
   AND cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA
  WHERE tc.TABLE_SCHEMA  = DATABASE()
    AND tc.TABLE_NAME    = 'visa_destination_details'
    AND tc.CONSTRAINT_TYPE = 'CHECK'
    AND cc.CHECK_CLAUSE  LIKE '%section_type%'
  LIMIT 1
);

SET @sql = IF(
  @chk_name IS NOT NULL,
  CONCAT('ALTER TABLE visa_destination_details DROP CHECK `', @chk_name, '`'),
  'SELECT 1'
);

PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Re-add CHECK with all section types
ALTER TABLE visa_destination_details
  ADD CONSTRAINT chk_visa_details_section_type
  CHECK (section_type IN (
    'overview',          -- overview heading + paragraph block
    'fact',              -- info cards grid (processing time, price, etc.)
    'requirement',       -- document checklist items
    'note',              -- general notes
    'hero_paragraph',    -- body paragraph(s) shown in hero
    'hero_chip',         -- pill/chip tag in hero tag row
    'support_title',     -- bold heading in Quick Support panel (1 row)
    'support_body',      -- body text in Quick Support panel (1 row)
    'support_item'       -- checklist item under "INCLUDED SUPPORT"
  ));

-- ================================================
-- STEP 2: Add new columns (idempotent) to
--         visa_destination_details
-- ================================================

-- icon_name: for fact cards and support icons
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name   = 'visa_destination_details'
     AND column_name  = 'icon_name') = 0,
  'ALTER TABLE visa_destination_details ADD COLUMN icon_name VARCHAR(80) AFTER label',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- col_span: grid layout hint — 1 = normal card, 2 = wide card
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name   = 'visa_destination_details'
     AND column_name  = 'col_span') = 0,
  'ALTER TABLE visa_destination_details ADD COLUMN col_span TINYINT NOT NULL DEFAULT 1 CHECK (col_span IN (1, 2)) AFTER icon_name',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- display_style: rendering hint for the frontend component
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name   = 'visa_destination_details'
     AND column_name  = 'display_style') = 0,
  'ALTER TABLE visa_destination_details ADD COLUMN display_style VARCHAR(30) NOT NULL DEFAULT ''card'' CHECK (display_style IN (''card'', ''checklist'', ''text'', ''chip'', ''badge'')) AFTER col_span',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- accent_color: optional color token for fact cards
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name   = 'visa_destination_details'
     AND column_name  = 'accent_color') = 0,
  'ALTER TABLE visa_destination_details ADD COLUMN accent_color VARCHAR(30) DEFAULT NULL AFTER display_style',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ================================================
-- STEP 3: Fix unique index — label is NULL for
--         hero/support rows so drop old index
--         and replace with a safer partial one
-- ================================================

SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name   = 'visa_destination_details'
    AND index_name   = 'ux_visa_details_destination_section_label'
);

SET @sql = IF(
  @idx_exists > 0,
  'ALTER TABLE visa_destination_details DROP INDEX ux_visa_details_destination_section_label',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- New index: unique only when label is present (fact/overview rows)
CREATE UNIQUE INDEX ux_visa_details_destination_section_label
  ON visa_destination_details (visa_destination_id, section_type, label(100));

-- Composite index for ordered detail page fetch
CREATE INDEX idx_visa_details_dest_section_order
  ON visa_destination_details (visa_destination_id, section_type, display_order);
