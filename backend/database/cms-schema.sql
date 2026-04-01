-- =========================================
-- CMS SCHEMA FOR GET2VACATION WEBSITE
-- =========================================

-- =========================================
-- 1. LANDING PAGE MANAGEMENT
-- =========================================

-- Floating cards on homepage hero section
CREATE TABLE landing_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(200) NOT NULL,
    tag VARCHAR(50),
    image_url TEXT NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_landing_places_active_order ON landing_places(is_active, display_order);

-- =========================================
-- 2. DESTINATIONS MANAGEMENT
-- =========================================

-- Main destinations table (shared with CRM)
CREATE TABLE destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) UNIQUE NOT NULL,
    slug VARCHAR(180) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(300),
    country VARCHAR(100),
    region VARCHAR(50),
    category VARCHAR(50),
    rating DECIMAL(2,1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    hero_image_url TEXT,
    thumbnail_url TEXT,
    is_popular BOOLEAN DEFAULT FALSE,
    is_new BOOLEAN DEFAULT FALSE,
    travel_type VARCHAR(50),
    season VARCHAR(50),
    meta_title VARCHAR(180),
    meta_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_destinations_active ON destinations(is_active);
CREATE INDEX idx_destinations_slug ON destinations(slug);
CREATE INDEX idx_destinations_popular ON destinations(is_popular, is_active);
CREATE INDEX idx_destinations_region ON destinations(region, is_active);

-- =========================================
-- 3. DESTINATION MEDIA GALLERY
-- =========================================

CREATE TABLE destination_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_id UUID NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    title VARCHAR(200),
    caption TEXT,
    display_order INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_destination_media_destination ON destination_media(destination_id, display_order);
CREATE INDEX idx_destination_media_featured ON destination_media(destination_id, is_featured);

-- =========================================
-- 4. SEASON CARDS (Best Time to Visit)
-- =========================================

CREATE TABLE season_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_id UUID NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    from_month VARCHAR(20) NOT NULL,
    to_month VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    tag VARCHAR(50),
    icon_name VARCHAR(50),
    icon_color VARCHAR(20),
    bg_color VARCHAR(20),
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_season_cards_destination ON season_cards(destination_id, display_order);

-- =========================================
-- 5. PACKAGE HIERARCHY (CMS Layer)
-- =========================================

-- Note: packages table exists in main-db.sql (shared with CRM)
-- This creates the CMS hierarchy layer on top

-- Main packages for website display
CREATE TABLE main_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    display_order INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(package_id)
);

CREATE INDEX idx_main_packages_package ON main_packages(package_id);
CREATE INDEX idx_main_packages_featured ON main_packages(is_featured, display_order);

-- Map destinations to main packages
CREATE TABLE destination_package_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_id UUID NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    main_package_id UUID NOT NULL REFERENCES main_packages(id) ON DELETE CASCADE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(destination_id, main_package_id)
);

CREATE INDEX idx_dest_package_map_destination ON destination_package_map(destination_id, display_order);
CREATE INDEX idx_dest_package_map_package ON destination_package_map(main_package_id);

-- Sub-packages (variants of main packages)
CREATE TABLE sub_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    main_package_id UUID NOT NULL REFERENCES main_packages(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(main_package_id, package_id)
);

CREATE INDEX idx_sub_packages_main ON sub_packages(main_package_id, display_order);
CREATE INDEX idx_sub_packages_package ON sub_packages(package_id);

-- =========================================
-- 6. VISA SERVICES MANAGEMENT
-- =========================================

CREATE TABLE visa_destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visa_destinations_active ON visa_destinations(is_active, display_order);
CREATE INDEX idx_visa_destinations_slug ON visa_destinations(slug);

-- Visa destination details (facts, requirements, etc.)
CREATE TABLE visa_destination_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visa_destination_id UUID NOT NULL REFERENCES visa_destinations(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL CHECK (section_type IN ('overview', 'fact', 'requirement', 'note')),
    label VARCHAR(200),
    value TEXT NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visa_details_destination ON visa_destination_details(visa_destination_id, section_type, display_order);

-- =========================================
-- 7. FEATURED/HOT PICKS (Optional)
-- =========================================

CREATE TABLE featured_picks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    subtitle VARCHAR(150),
    category VARCHAR(50) NOT NULL CHECK (category IN ('package', 'visa_service', 'destination')),
    reference_id UUID,
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_featured_picks_active ON featured_picks(is_active, display_order);
CREATE INDEX idx_featured_picks_category ON featured_picks(category, is_active);

-- =========================================
-- 8. CMS USERS & PERMISSIONS (Optional)
-- =========================================

-- If separate from CRM users, create dedicated CMS user table
-- Otherwise, use existing users table with role-based access

CREATE TABLE cms_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cms_activity_user ON cms_activity_log(user_id, created_at DESC);
CREATE INDEX idx_cms_activity_entity ON cms_activity_log(entity_type, entity_id, created_at DESC);
