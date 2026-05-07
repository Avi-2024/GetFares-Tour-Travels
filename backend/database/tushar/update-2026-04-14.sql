-- update-2026-04-14.sql
-- CMS schema alignment patch
-- Idempotent MySQL 8+ scriptSET time_zone = '+05:30';

CREATE TABLE  landing_places (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(150) NOT NULL,
  country VARCHAR(100) NULL,
  tag VARCHAR(120) NULL,
  image_url TEXT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE  destination_media (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  destination_id CHAR(36) NOT NULL,
  media_type VARCHAR(20) NOT NULL DEFAULT 'image',
  media_url TEXT NOT NULL,
  thumbnail_url TEXT NULL,
  title VARCHAR(255) NULL,
  caption TEXT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_destination_media_destination FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE
);

CREATE TABLE  season_cards (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  destination_id CHAR(36) NULL,
  title VARCHAR(150) NULL,
  from_month VARCHAR(20) NULL,
  to_month VARCHAR(20) NULL,
  description TEXT NULL,
  tag VARCHAR(80) NULL,
  image_url TEXT NULL,
  icon_name VARCHAR(80) NULL,
  icon_color VARCHAR(20) NULL,
  bg_color VARCHAR(20) NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_season_cards_destination FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE SET NULL
);

CREATE TABLE  destination_package_map (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  destination_id CHAR(36) NOT NULL,
  main_package_id CHAR(36) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE  main_packages (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  package_id CHAR(36) NULL,
  destination_id CHAR(36) NULL,
  country VARCHAR(100) NULL,
  title VARCHAR(200) NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  features JSON NULL,
  inclusions JSON NULL,
  meta_title VARCHAR(180) NULL,
  meta_description TEXT NULL,
  keywords TEXT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE  sub_packages (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  main_package_id CHAR(36) NOT NULL,
  package_id CHAR(36) NULL,
  title VARCHAR(200) NULL,
  image TEXT NULL,
  rating DECIMAL(4,2) NOT NULL DEFAULT 0,
  location VARCHAR(200) NULL,
  duration_days INT NOT NULL DEFAULT 0,
  duration_nights INT NOT NULL DEFAULT 0,
  duration VARCHAR(50) NULL,
  starting_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  transport VARCHAR(120) NULL,
  description TEXT NULL,
  snapshot TEXT NULL,
  features JSON NULL,
  itineraries JSON NULL,
  highlights JSON NULL,
  inclusions JSON NULL,
  exclusions JSON NULL,
  payment_terms JSON NULL,
  cancellation_policy JSON NULL,
  tnc JSON NULL,
  imp_notes JSON NULL,
  meta_title VARCHAR(180) NULL,
  meta_description TEXT NULL,
  keywords TEXT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE  visa_destinations (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  country VARCHAR(100) NULL,
  destination VARCHAR(120) NULL,
  title VARCHAR(160) NULL,
  slug VARCHAR(180) NULL,
  sub_description TEXT NULL,
  subtitle TEXT NULL,
  description TEXT NULL,
  description_items JSON NULL,
  subtitle_items JSON NULL,
  image_url TEXT NULL,
  hero_image_url TEXT NULL,
  processing_time VARCHAR(120) NULL,
  support_info TEXT NULL,
  support_title VARCHAR(200) NULL,
  support_description TEXT NULL,
  support_list JSON NULL,
  icon_name VARCHAR(80) NULL,
  highlights JSON NULL,
  cta_text VARCHAR(120) NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE  visa_destination_details (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  visa_destination_id CHAR(36) NOT NULL,
  section_type VARCHAR(50) NOT NULL,
  label VARCHAR(255) NULL,
  icon_name VARCHAR(80) NULL,
  col_span TINYINT NOT NULL DEFAULT 1,
  display_style VARCHAR(30) NOT NULL DEFAULT 'card',
  accent_color VARCHAR(30) NULL,
  value TEXT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_visa_details_destination FOREIGN KEY (visa_destination_id) REFERENCES visa_destinations(id) ON DELETE CASCADE
);

CREATE TABLE  featured_picks (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  slug VARCHAR(180) NULL,
  title VARCHAR(200) NULL,
  subtitle VARCHAR(255) NULL,
  category VARCHAR(80) NULL,
  campaign_type VARCHAR(80) NULL,
  section_key VARCHAR(80) NULL,
  reference_id VARCHAR(120) NULL,
  country VARCHAR(100) NULL,
  rating DECIMAL(4,2) NOT NULL DEFAULT 0,
  badge_text VARCHAR(120) NULL,
  original_price DECIMAL(12,2) NULL,
  discounted_price DECIMAL(12,2) NULL,
  duration VARCHAR(80) NULL,
  description TEXT NULL,
  image_url TEXT NULL,
  button_text VARCHAR(120) NULL,
  cta_url TEXT NULL,
  expires_on DATE NULL,
  tags JSON NULL,
  highlights JSON NULL,
  metadata JSON NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE  landing_hero_sections (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  country VARCHAR(100) NULL,
  section_key VARCHAR(80) NOT NULL,
  eyebrow_text VARCHAR(200) NULL,
  heading_line_1 VARCHAR(255) NULL,
  heading_line_2 VARCHAR(255) NULL,
  description TEXT NULL,
  primary_cta_label VARCHAR(120) NULL,
  primary_cta_url TEXT NULL,
  secondary_cta_label VARCHAR(120) NULL,
  secondary_cta_url TEXT NULL,
  background_image_url TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_landing_hero_country_section (country, section_key)
);

-- Currency Rates Table
CREATE TABLE IF NOT EXISTS currency_rates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  base_currency VARCHAR(3) NOT NULL DEFAULT 'AED',
  rates JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_base_currency (base_currency),
  INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE leads
  ADD COLUMN salary DECIMAL(12,2) NULL AFTER budget;
  
ALTER TABLE destinations ADD COLUMN  slug VARCHAR(180) NULL;
ALTER TABLE destinations ADD COLUMN  description TEXT NULL;
ALTER TABLE destinations ADD COLUMN  short_description TEXT NULL;
ALTER TABLE destinations ADD COLUMN  region VARCHAR(120) NULL;
ALTER TABLE destinations ADD COLUMN  category VARCHAR(80) NULL;
ALTER TABLE destinations ADD COLUMN  rating DECIMAL(4,2) NOT NULL DEFAULT 0;
ALTER TABLE destinations ADD COLUMN  hero_image_url TEXT NULL;
ALTER TABLE destinations ADD COLUMN  thumbnail_url TEXT NULL;
ALTER TABLE destinations ADD COLUMN  title_image_url TEXT NULL;
ALTER TABLE destinations ADD COLUMN  is_popular TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE destinations ADD COLUMN  is_new TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE destinations ADD COLUMN  travel_type VARCHAR(80) NULL;
ALTER TABLE destinations ADD COLUMN  season VARCHAR(120) NULL;
ALTER TABLE destinations ADD COLUMN  key_highlights JSON NULL;
ALTER TABLE destinations ADD COLUMN  services JSON NULL;
ALTER TABLE destinations ADD COLUMN  best_time_to_visit JSON NULL;
ALTER TABLE destinations ADD COLUMN  meta_title VARCHAR(180) NULL;
ALTER TABLE destinations ADD COLUMN  meta_description TEXT NULL;
ALTER TABLE destinations ADD COLUMN  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE destinations ADD COLUMN  is_deleted TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE packages ADD COLUMN  is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE packages ADD COLUMN  destination VARCHAR(120) NULL;
ALTER TABLE packages ADD COLUMN  duration VARCHAR(50) NULL;
ALTER TABLE packages ADD COLUMN  inclusions TEXT NULL;
ALTER TABLE packages ADD COLUMN  exclusions TEXT NULL;
ALTER TABLE packages ADD COLUMN  hotel_details TEXT NULL;
ALTER TABLE packages ADD COLUMN  package_category VARCHAR(30) NULL;
ALTER TABLE packages ADD COLUMN  banner_image_url TEXT NULL;
ALTER TABLE packages ADD COLUMN  gallery_image_urls JSON NULL;
ALTER TABLE packages ADD COLUMN  itinerary JSON NULL;
ALTER TABLE packages ADD COLUMN  publish_to_website TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE packages ADD COLUMN  website_slug VARCHAR(180) NULL;
ALTER TABLE packages ADD COLUMN  is_sold_out TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE landing_places ADD COLUMN  is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE main_packages ADD COLUMN  is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE sub_packages ADD COLUMN  is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE visa_destinations ADD COLUMN  is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE visa_destinations ADD COLUMN  overview_title VARCHAR(255) NULL;
ALTER TABLE visa_destinations ADD COLUMN  overview_description TEXT NULL;
ALTER TABLE visa_destinations ADD COLUMN  visa_details JSON NULL;
ALTER TABLE visa_destinations ADD COLUMN  requirements JSON NULL;
ALTER TABLE visa_destinations ADD COLUMN  meta_title VARCHAR(180) NULL;
ALTER TABLE visa_destinations ADD COLUMN  meta_description TEXT NULL;
ALTER TABLE visa_destinations ADD COLUMN  keywords TEXT NULL;
ALTER TABLE visa_destination_details ADD COLUMN  is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE featured_picks ADD COLUMN  is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE season_cards ADD COLUMN  is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE destination_media ADD COLUMN  is_deleted TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE destination_package_map ADD COLUMN  is_deleted TINYINT(1) NOT NULL DEFAULT 0;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'landing_places' AND index_name = 'idx_landing_places_is_deleted') = 0,
  'CREATE INDEX idx_landing_places_is_deleted ON landing_places(is_deleted)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;

 EXECUTE stmt;

 DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'destinations' AND index_name = 'idx_destinations_is_deleted') = 0,
  'CREATE INDEX idx_destinations_is_deleted ON destinations(is_deleted)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;

 EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'packages' AND index_name = 'idx_packages_is_deleted') = 0,
  'CREATE INDEX idx_packages_is_deleted ON packages(is_deleted)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'main_packages' AND index_name = 'idx_main_packages_is_deleted') = 0,
  'CREATE INDEX idx_main_packages_is_deleted ON main_packages(is_deleted)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;

 EXECUTE stmt;

 DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'sub_packages' AND index_name = 'idx_sub_packages_is_deleted') = 0,
  'CREATE INDEX idx_sub_packages_is_deleted ON sub_packages(is_deleted)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;

 EXECUTE stmt;

 DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'visa_destinations' AND index_name = 'idx_visa_destinations_is_deleted') = 0,
  'CREATE INDEX idx_visa_destinations_is_deleted ON visa_destinations(is_deleted)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;

 EXECUTE stmt;

 DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'visa_destination_details' AND index_name = 'idx_visa_destination_details_is_deleted') = 0,
  'CREATE INDEX idx_visa_destination_details_is_deleted ON visa_destination_details(is_deleted)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;

 EXECUTE stmt;

 DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'featured_picks' AND index_name = 'idx_featured_picks_is_deleted') = 0,
  'CREATE INDEX idx_featured_picks_is_deleted ON featured_picks(is_deleted)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;

 EXECUTE stmt;

 DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'season_cards' AND index_name = 'idx_season_cards_is_deleted') = 0,
  'CREATE INDEX idx_season_cards_is_deleted ON season_cards(is_deleted)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;

 EXECUTE stmt;

 DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'destination_media' AND index_name = 'idx_destination_media_is_deleted') = 0,
  'CREATE INDEX idx_destination_media_is_deleted ON destination_media(is_deleted)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;

 EXECUTE stmt;

 DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'destination_package_map' AND index_name = 'idx_destination_package_map_is_deleted') = 0,
  'CREATE INDEX idx_destination_package_map_is_deleted ON destination_package_map(is_deleted)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;

 EXECUTE stmt;

 DEALLOCATE PREPARE stmt;
