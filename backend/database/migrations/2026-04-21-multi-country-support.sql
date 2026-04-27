-- Migration: Multi-Country Support and Badge Field
-- Date: 2026-04-21
-- Description: 
--   1. Create countries table
--   2. Add country_ids JSON field to relevant tables
--   3. Add badge field to packages table
--   4. Populate countries table with initial data

-- ============================================
-- 1. CREATE COUNTRIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS `countries` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `code` VARCHAR(3) NOT NULL UNIQUE COMMENT 'ISO 3166-1 alpha-3 code',
  `code_alpha2` VARCHAR(2) NOT NULL UNIQUE COMMENT 'ISO 3166-1 alpha-2 code',
  `flag_emoji` VARCHAR(10) DEFAULT NULL,
  `currency_code` VARCHAR(3) DEFAULT NULL,
  `currency_symbol` VARCHAR(10) DEFAULT NULL,
  `phone_code` VARCHAR(10) DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `display_order` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_countries_name` (`name`),
  INDEX `idx_countries_code` (`code`),
  INDEX `idx_countries_is_active` (`is_active`),
  INDEX `idx_countries_display_order` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. POPULATE COUNTRIES TABLE
-- ============================================

INSERT INTO `countries` (`id`, `name`, `code`, `code_alpha2`, `flag_emoji`, `currency_code`, `currency_symbol`, `phone_code`, `is_active`, `display_order`) VALUES
(UUID(), 'India', 'IND', 'IN', '🇮🇳', 'INR', '₹', '+91', 1, 1),
(UUID(), 'United Arab Emirates', 'ARE', 'AE', '🇦🇪', 'AED', 'د.إ', '+971', 1, 2),
(UUID(), 'Saudi Arabia', 'SAU', 'SA', '🇸🇦', 'SAR', 'ر.س', '+966', 1, 3),
(UUID(), 'United States', 'USA', 'US', '🇺🇸', 'USD', '$', '+1', 1, 4),
(UUID(), 'United Kingdom', 'GBR', 'GB', '🇬🇧', 'GBP', '£', '+44', 1, 5),
(UUID(), 'Maldives', 'MDV', 'MV', '🇲🇻', 'MVR', 'Rf', '+960', 1, 10),
(UUID(), 'Thailand', 'THA', 'TH', '🇹🇭', 'THB', '฿', '+66', 1, 11),
(UUID(), 'Singapore', 'SGP', 'SG', '🇸🇬', 'SGD', 'S$', '+65', 1, 12),
(UUID(), 'Malaysia', 'MYS', 'MY', '🇲🇾', 'MYR', 'RM', '+60', 1, 13),
(UUID(), 'Indonesia', 'IDN', 'ID', '🇮🇩', 'IDR', 'Rp', '+62', 1, 14),
(UUID(), 'Turkey', 'TUR', 'TR', '🇹🇷', 'TRY', '₺', '+90', 1, 15),
(UUID(), 'Egypt', 'EGY', 'EG', '🇪🇬', 'EGP', 'E£', '+20', 1, 16),
(UUID(), 'France', 'FRA', 'FR', '🇫🇷', 'EUR', '€', '+33', 1, 20),
(UUID(), 'Italy', 'ITA', 'IT', '🇮🇹', 'EUR', '€', '+39', 1, 21),
(UUID(), 'Spain', 'ESP', 'ES', '🇪🇸', 'EUR', '€', '+34', 1, 22),
(UUID(), 'Switzerland', 'CHE', 'CH', '🇨🇭', 'CHF', 'Fr', '+41', 1, 23),
(UUID(), 'Austria', 'AUT', 'AT', '🇦🇹', 'EUR', '€', '+43', 1, 24),
(UUID(), 'Germany', 'DEU', 'DE', '🇩🇪', 'EUR', '€', '+49', 1, 25),
(UUID(), 'Netherlands', 'NLD', 'NL', '🇳🇱', 'EUR', '€', '+31', 1, 26),
(UUID(), 'Japan', 'JPN', 'JP', '🇯🇵', 'JPY', '¥', '+81', 1, 30),
(UUID(), 'South Korea', 'KOR', 'KR', '🇰🇷', 'KRW', '₩', '+82', 1, 31),
(UUID(), 'China', 'CHN', 'CN', '🇨🇳', 'CNY', '¥', '+86', 1, 32),
(UUID(), 'Australia', 'AUS', 'AU', '🇦🇺', 'AUD', 'A$', '+61', 1, 40),
(UUID(), 'New Zealand', 'NZL', 'NZ', '🇳🇿', 'NZD', 'NZ$', '+64', 1, 41),
(UUID(), 'Canada', 'CAN', 'CA', '🇨🇦', 'CAD', 'C$', '+1', 1, 42),
(UUID(), 'Brazil', 'BRA', 'BR', '🇧🇷', 'BRL', 'R$', '+55', 1, 50),
(UUID(), 'Argentina', 'ARG', 'AR', '🇦🇷', 'ARS', '$', '+54', 1, 51),
(UUID(), 'South Africa', 'ZAF', 'ZA', '🇿🇦', 'ZAR', 'R', '+27', 1, 60),
(UUID(), 'Kenya', 'KEN', 'KE', '🇰🇪', 'KES', 'KSh', '+254', 1, 61),
(UUID(), 'Morocco', 'MAR', 'MA', '🇲🇦', 'MAD', 'د.م.', '+212', 1, 62),
(UUID(), 'Russia', 'RUS', 'RU', '🇷🇺', 'RUB', '₽', '+7', 1, 70),
(UUID(), 'Greece', 'GRC', 'GR', '🇬🇷', 'EUR', '€', '+30', 1, 71),
(UUID(), 'Portugal', 'PRT', 'PT', '🇵🇹', 'EUR', '€', '+351', 1, 72),
(UUID(), 'Vietnam', 'VNM', 'VN', '🇻🇳', 'VND', '₫', '+84', 1, 80),
(UUID(), 'Cambodia', 'KHM', 'KH', '🇰🇭', 'KHR', '៛', '+855', 1, 81),
(UUID(), 'Sri Lanka', 'LKA', 'LK', '🇱🇰', 'LKR', 'Rs', '+94', 1, 82),
(UUID(), 'Nepal', 'NPL', 'NP', '🇳🇵', 'NPR', 'Rs', '+977', 1, 83),
(UUID(), 'Bhutan', 'BTN', 'BT', '🇧🇹', 'BTN', 'Nu', '+975', 1, 84),
(UUID(), 'Qatar', 'QAT', 'QA', '🇶🇦', 'QAR', 'ر.ق', '+974', 1, 90),
(UUID(), 'Kuwait', 'KWT', 'KW', '🇰🇼', 'KWD', 'د.ك', '+965', 1, 91),
(UUID(), 'Oman', 'OMN', 'OM', '🇴🇲', 'OMR', 'ر.ع.', '+968', 1, 92),
(UUID(), 'Bahrain', 'BHR', 'BH', '🇧🇭', 'BHD', 'د.ب', '+973', 1, 93),
(UUID(), 'Jordan', 'JOR', 'JO', '🇯🇴', 'JOD', 'د.ا', '+962', 1, 94),
(UUID(), 'Lebanon', 'LBN', 'LB', '🇱🇧', 'LBP', 'ل.ل', '+961', 1, 95),
(UUID(), 'Armenia', 'ARM', 'AM', '🇦🇲', 'AMD', '֏', '+374', 1, 100),
(UUID(), 'Georgia', 'GEO', 'GE', '🇬🇪', 'GEL', '₾', '+995', 1, 101),
(UUID(), 'Azerbaijan', 'AZE', 'AZ', '🇦🇿', 'AZN', '₼', '+994', 1, 102),
(UUID(), 'Laos', 'LAO', 'LA', '🇱🇦', 'LAK', '₭', '+856', 1, 103),
(UUID(), 'Myanmar', 'MMR', 'MM', '🇲🇲', 'MMK', 'K', '+95', 1, 104),
(UUID(), 'Philippines', 'PHL', 'PH', '🇵🇭', 'PHP', '₱', '+63', 1, 105);

-- ============================================
-- 3. ADD COUNTRY_IDS FIELD TO TABLES
-- ============================================

-- Add country_ids to landing_places
ALTER TABLE `landing_places` 
ADD COLUMN `country_ids` JSON DEFAULT NULL COMMENT 'Array of country IDs' AFTER `country`,
ADD INDEX `idx_landing_places_country_ids` ((CAST(`country_ids` AS CHAR(255) ARRAY)));

-- Add country_ids to destinations
ALTER TABLE `destinations` 
ADD COLUMN `country_ids` JSON DEFAULT NULL COMMENT 'Array of country IDs' AFTER `country`,
ADD INDEX `idx_destinations_country_ids` ((CAST(`country_ids` AS CHAR(255) ARRAY)));

-- Add country_ids to main_packages
ALTER TABLE `main_packages` 
ADD COLUMN `country_ids` JSON DEFAULT NULL COMMENT 'Array of country IDs' AFTER `country`,
ADD INDEX `idx_main_packages_country_ids` ((CAST(`country_ids` AS CHAR(255) ARRAY)));

-- Add country_ids to packages
ALTER TABLE `packages` 
ADD COLUMN `country_ids` JSON DEFAULT NULL COMMENT 'Array of country IDs' AFTER `destination`,
ADD INDEX `idx_packages_country_ids` ((CAST(`country_ids` AS CHAR(255) ARRAY)));

-- Add country_ids to visa_destinations
ALTER TABLE `visa_destinations` 
ADD COLUMN `country_ids` JSON DEFAULT NULL COMMENT 'Array of country IDs' AFTER `country`,
ADD INDEX `idx_visa_destinations_country_ids` ((CAST(`country_ids` AS CHAR(255) ARRAY)));

-- Add country_ids to featured_picks
ALTER TABLE `featured_picks` 
ADD COLUMN `country_ids` JSON DEFAULT NULL COMMENT 'Array of country IDs' AFTER `country`,
ADD INDEX `idx_featured_picks_country_ids` ((CAST(`country_ids` AS CHAR(255) ARRAY)));

-- ============================================
-- 4. ADD BADGE FIELD TO PACKAGES
-- ============================================

ALTER TABLE `packages` 
ADD COLUMN `badge` VARCHAR(100) DEFAULT NULL COMMENT 'Badge text for package' AFTER `name`,
ADD INDEX `idx_packages_badge` (`badge`);

ALTER TABLE `main_packages` 
ADD COLUMN `badge` VARCHAR(100) DEFAULT NULL COMMENT 'Badge text for main package' AFTER `title`,
ADD INDEX `idx_main_packages_badge` (`badge`);

-- ============================================
-- 5. MIGRATE EXISTING COUNTRY DATA
-- ============================================

-- Migrate landing_places country to country_ids
UPDATE `landing_places` lp
LEFT JOIN `countries` c ON lp.country = c.name
SET lp.country_ids = JSON_ARRAY(c.id)
WHERE lp.country IS NOT NULL AND c.id IS NOT NULL;

-- Migrate destinations country to country_ids
UPDATE `destinations` d
LEFT JOIN `countries` c ON d.country = c.name
SET d.country_ids = JSON_ARRAY(c.id)
WHERE d.country IS NOT NULL AND c.id IS NOT NULL;

-- Migrate main_packages country to country_ids
UPDATE `main_packages` mp
LEFT JOIN `countries` c ON mp.country = c.name
SET mp.country_ids = JSON_ARRAY(c.id)
WHERE mp.country IS NOT NULL AND c.id IS NOT NULL;

-- Migrate visa_destinations country to country_ids
UPDATE `visa_destinations` vd
LEFT JOIN `countries` c ON vd.country = c.name
SET vd.country_ids = JSON_ARRAY(c.id)
WHERE vd.country IS NOT NULL AND c.id IS NOT NULL;

-- Migrate featured_picks country to country_ids
UPDATE `featured_picks` fp
LEFT JOIN `countries` c ON fp.country = c.name
SET fp.country_ids = JSON_ARRAY(c.id)
WHERE fp.country IS NOT NULL AND c.id IS NOT NULL;

-- ============================================
-- 6. ADD HELPER FUNCTIONS (OPTIONAL)
-- ============================================

-- Note: Keep the old 'country' column for backward compatibility
-- You can drop them later after full migration:
-- ALTER TABLE `landing_places` DROP COLUMN `country`;
-- ALTER TABLE `destinations` DROP COLUMN `country`;
-- ALTER TABLE `main_packages` DROP COLUMN `country`;
-- ALTER TABLE `visa_destinations` DROP COLUMN `country`;
-- ALTER TABLE `featured_picks` DROP COLUMN `country`;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
