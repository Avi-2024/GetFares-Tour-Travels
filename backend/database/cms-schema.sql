-- =========================================
-- CMS SCHEMA FOR GET2VACATION WEBSITE
-- =========================================

-- =========================================
-- 1. LANDING PAGE MANAGEMENT
-- =========================================

-- Floating cards on homepage hero section
CREATE TABLE landing_places (
    id CHAR(36) PRIMARY KEY DEFAULT UUID(),
    name VARCHAR(100) NOT NULL,
    country VARCHAR(100),
    tag VARCHAR(50),
    description TEXT,
    image_url TEXT NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_landing_places_active_order ON landing_places(is_active, display_order);
CREATE INDEX idx_landing_places_country_active_order ON landing_places(country, is_active, display_order);

-- =========================================
-- 2. DESTINATIONS MANAGEMENT
-- =========================================

-- Main destinations table is created in main-db.sql (shared with CRM)
-- Here we only extend it with CMS-specific columns.
ALTER TABLE destinations ADD COLUMN slug VARCHAR(180);
ALTER TABLE destinations ADD COLUMN description TEXT;
ALTER TABLE destinations ADD COLUMN short_description VARCHAR(300);
ALTER TABLE destinations ADD COLUMN region VARCHAR(50);
ALTER TABLE destinations ADD COLUMN category VARCHAR(50);
ALTER TABLE destinations ADD COLUMN rating DECIMAL(2,1) DEFAULT 0.0;
ALTER TABLE destinations ADD COLUMN hero_image_url TEXT;
ALTER TABLE destinations ADD COLUMN thumbnail_url TEXT;
ALTER TABLE destinations ADD COLUMN is_popular BOOLEAN DEFAULT FALSE;
ALTER TABLE destinations ADD COLUMN is_new BOOLEAN DEFAULT FALSE;
ALTER TABLE destinations ADD COLUMN travel_type VARCHAR(50);
ALTER TABLE destinations ADD COLUMN season VARCHAR(50);
ALTER TABLE destinations ADD COLUMN meta_title VARCHAR(180);
ALTER TABLE destinations ADD COLUMN meta_description TEXT;
ALTER TABLE destinations ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE destinations ADD CONSTRAINT destinations_rating_check
  CHECK (rating >= 0 AND rating <= 5);

CREATE UNIQUE INDEX ux_destinations_slug ON destinations(slug);
CREATE INDEX idx_destinations_active ON destinations(is_active);
CREATE INDEX idx_destinations_slug ON destinations(slug);
CREATE INDEX idx_destinations_popular ON destinations(is_popular, is_active);
CREATE INDEX idx_destinations_region ON destinations(region, is_active);

-- =========================================
-- 3. DESTINATION MEDIA GALLERY
-- =========================================

CREATE TABLE destination_media (
    id CHAR(36) PRIMARY KEY DEFAULT UUID(),
    destination_id CHAR(36) NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    title VARCHAR(200),
    caption TEXT,
    display_order INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_destination_media_destination ON destination_media(destination_id, display_order);
CREATE INDEX idx_destination_media_featured ON destination_media(destination_id, is_featured);
CREATE UNIQUE INDEX ux_destination_media_destination_url
  ON destination_media(destination_id, media_url);

-- =========================================
-- 4. SEASON CARDS (Best Time to Visit)
-- =========================================

CREATE TABLE season_cards (
    id CHAR(36) PRIMARY KEY DEFAULT UUID(),
    destination_id CHAR(36) NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    from_month VARCHAR(20) NOT NULL,
    to_month VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    tag VARCHAR(50),
    icon_name VARCHAR(50),
    icon_color VARCHAR(20),
    bg_color VARCHAR(20),
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_season_cards_destination ON season_cards(destination_id, display_order);

-- =========================================
-- 5. PACKAGE HIERARCHY (CMS Layer)
-- =========================================

-- Note: packages table exists in main-db.sql (shared with CRM)
-- This creates the CMS hierarchy layer on top

-- Main packages for website display
CREATE TABLE main_packages (
    id CHAR(36) PRIMARY KEY DEFAULT UUID(),
    package_id CHAR(36) NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    country VARCHAR(100),
    display_order INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(package_id)
);

CREATE INDEX idx_main_packages_package ON main_packages(package_id);
CREATE INDEX idx_main_packages_featured ON main_packages(is_featured, display_order);
CREATE INDEX idx_main_packages_country_featured ON main_packages(country, is_featured, display_order);

-- Map destinations to main packages
CREATE TABLE destination_package_map (
    id CHAR(36) PRIMARY KEY DEFAULT UUID(),
    destination_id CHAR(36) NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    main_package_id CHAR(36) NOT NULL REFERENCES main_packages(id) ON DELETE CASCADE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(destination_id, main_package_id)
);

CREATE INDEX idx_dest_package_map_destination ON destination_package_map(destination_id, display_order);
CREATE INDEX idx_dest_package_map_package ON destination_package_map(main_package_id);

-- Sub-packages (variants of main packages)
CREATE TABLE sub_packages (
    id CHAR(36) PRIMARY KEY DEFAULT UUID(),
    main_package_id CHAR(36) NOT NULL REFERENCES main_packages(id) ON DELETE CASCADE,
    package_id CHAR(36) NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(main_package_id, package_id)
);

CREATE INDEX idx_sub_packages_main ON sub_packages(main_package_id, display_order);
CREATE INDEX idx_sub_packages_package ON sub_packages(package_id);

-- =========================================
-- 6. VISA SERVICES MANAGEMENT
-- =========================================

CREATE TABLE visa_destinations (
    id CHAR(36) PRIMARY KEY DEFAULT UUID(),
    country VARCHAR(100),
    title VARCHAR(150) NOT NULL,
    slug VARCHAR(180) UNIQUE NOT NULL,
    subtitle VARCHAR(200),
    description TEXT,
    image_url TEXT NOT NULL,
    hero_image_url TEXT,
    processing_time VARCHAR(100),
    support_info TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_visa_destinations_active ON visa_destinations(is_active, display_order);
CREATE INDEX idx_visa_destinations_slug ON visa_destinations(slug);
CREATE INDEX idx_visa_destinations_country_active ON visa_destinations(country, is_active, display_order);

-- Visa destination details (facts, requirements, etc.)
CREATE TABLE visa_destination_details (
    id CHAR(36) PRIMARY KEY DEFAULT UUID(),
    visa_destination_id CHAR(36) NOT NULL REFERENCES visa_destinations(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL CHECK (section_type IN ('overview', 'fact', 'requirement', 'note')),
    label VARCHAR(200),
    value TEXT NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_visa_details_destination ON visa_destination_details(visa_destination_id, section_type, display_order);
CREATE UNIQUE INDEX ux_visa_details_destination_section_label
  ON visa_destination_details(visa_destination_id, section_type, label);

-- =========================================
-- 7. FEATURED/HOT PICKS (Optional)
-- =========================================

CREATE TABLE featured_picks (
    id CHAR(36) PRIMARY KEY DEFAULT UUID(),
    title VARCHAR(150) NOT NULL,
    subtitle VARCHAR(150),
    category VARCHAR(50) NOT NULL CHECK (category IN ('package', 'visa_service', 'destination')),
    reference_id CHAR(36),
    country VARCHAR(100),
    rating DECIMAL(2,1) DEFAULT 0.0,
    badge_text VARCHAR(100),
    original_price NUMERIC(10,2),
    discounted_price NUMERIC(10,2),
    duration VARCHAR(100),
    description TEXT,
    image_url TEXT NOT NULL,
    button_text VARCHAR(50) DEFAULT 'Book Now',
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_featured_picks_active ON featured_picks(is_active, display_order);
CREATE INDEX idx_featured_picks_category ON featured_picks(category, is_active);

-- =========================================
-- 8. CMS USERS & PERMISSIONS (Optional)
-- =========================================

-- If separate from CRM users, create dedicated CMS user table
-- Otherwise, use existing users table with role-based access

CREATE TABLE cms_activity_log (
    id CHAR(36) PRIMARY KEY DEFAULT UUID(),
    user_id CHAR(36) REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id CHAR(36),
    old_data JSON,
    new_data JSON,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cms_activity_user ON cms_activity_log(user_id, created_at DESC);
CREATE INDEX idx_cms_activity_entity ON cms_activity_log(entity_type, entity_id, created_at DESC);

-- =========================================
-- 9. CMS HOMEPAGE HERO CONTENT
-- =========================================

CREATE TABLE IF NOT EXISTS landing_hero_sections (
    id CHAR(36) PRIMARY KEY DEFAULT UUID(),
    country VARCHAR(100) NOT NULL DEFAULT 'GLOBAL',
    section_key VARCHAR(100) NOT NULL,
    eyebrow_text VARCHAR(200),
    heading_line_1 VARCHAR(255),
    heading_line_2 VARCHAR(255),
    description TEXT,
    primary_cta_label VARCHAR(100),
    primary_cta_url TEXT,
    secondary_cta_label VARCHAR(100),
    secondary_cta_url TEXT,
    background_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Existing table extensions for richer website cards
ALTER TABLE landing_places ADD COLUMN country VARCHAR(100);
ALTER TABLE main_packages ADD COLUMN country VARCHAR(100);
ALTER TABLE visa_destinations ADD COLUMN country VARCHAR(100);
UPDATE landing_hero_sections SET country = 'GLOBAL' WHERE country IS NULL;
ALTER TABLE landing_hero_sections MODIFY COLUMN country VARCHAR(100) NOT NULL DEFAULT 'GLOBAL';

CREATE INDEX idx_destinations_country_active ON destinations(country, is_active);
CREATE INDEX idx_landing_places_country_active_order ON landing_places(country, is_active, display_order);
CREATE INDEX idx_main_packages_country_featured ON main_packages(country, is_featured, display_order);
CREATE INDEX idx_visa_destinations_country_active ON visa_destinations(country, is_active, display_order);
CREATE INDEX idx_featured_picks_country_active ON featured_picks(country, is_active, display_order);
CREATE INDEX idx_landing_hero_sections_country_active ON landing_hero_sections(country, is_active, section_key);
CREATE UNIQUE INDEX ux_landing_hero_sections_country_section
  ON landing_hero_sections(country, section_key);

ALTER TABLE featured_picks ADD COLUMN slug VARCHAR(180);
ALTER TABLE featured_picks ADD COLUMN campaign_type VARCHAR(50) DEFAULT 'featured';
ALTER TABLE featured_picks ADD COLUMN section_key VARCHAR(80) DEFAULT 'featured-hot-picks';
ALTER TABLE featured_picks ADD COLUMN tags JSON DEFAULT (JSON_ARRAY());
ALTER TABLE featured_picks ADD COLUMN highlights JSON DEFAULT (JSON_ARRAY());
ALTER TABLE featured_picks ADD COLUMN expires_on DATE;
ALTER TABLE featured_picks ADD COLUMN cta_url TEXT;
ALTER TABLE featured_picks ADD COLUMN metadata JSON DEFAULT (JSON_OBJECT());
CREATE UNIQUE INDEX ux_featured_picks_slug ON featured_picks(slug);

ALTER TABLE season_cards ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE season_cards ADD COLUMN image_url TEXT;

ALTER TABLE visa_destinations ADD COLUMN icon_name VARCHAR(80);
ALTER TABLE visa_destinations ADD COLUMN highlights JSON DEFAULT (JSON_ARRAY());
ALTER TABLE visa_destinations ADD COLUMN cta_text VARCHAR(50) DEFAULT 'View Details';

-- =========================================
-- 10. GENERIC MEDIA ASSETS FOR CMS ENTITIES
-- =========================================

CREATE TABLE IF NOT EXISTS cms_media_assets (
    id CHAR(36) PRIMARY KEY DEFAULT UUID(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id CHAR(36) NOT NULL,
    media_kind VARCHAR(20) NOT NULL DEFAULT 'image',
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    title VARCHAR(200),
    alt_text VARCHAR(250),
    display_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cms_media_assets_entity
  ON cms_media_assets(entity_type, entity_id, display_order);
CREATE UNIQUE INDEX ux_cms_media_assets_entity_url
  ON cms_media_assets(entity_type, entity_id, media_url);
