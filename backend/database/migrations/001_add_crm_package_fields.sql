-- =========================================
-- MIGRATION: Add CRM Fields to Packages Table
-- =========================================
-- This migration adds fields used by CRM that may be missing
-- Safe to run multiple times (uses IF NOT EXISTS)
-- =========================================

-- Add base_cost for CRM pricing calculations
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS base_cost NUMERIC(12,2) DEFAULT 0 CHECK (base_cost >= 0);

-- Add markup_percent for CRM profit margins
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS markup_percent NUMERIC(5,2) DEFAULT 0 CHECK (markup_percent >= 0 AND markup_percent <= 100);

-- Add package_kind to differentiate READY vs CUSTOMIZED packages
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS package_kind VARCHAR(20) DEFAULT 'READY' CHECK (package_kind IN ('READY', 'CUSTOMIZED'));

-- Add custom_services for customized package details (JSONB)
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS custom_services JSONB DEFAULT '[]'::jsonb;

-- Add visa_details for visa information
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS visa_details TEXT;

-- Add payment_terms for payment conditions
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS payment_terms TEXT;

-- Add package_category for categorization
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS package_category VARCHAR(30);

-- Add status for package lifecycle management
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'DRAFT' 
CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'SOLD_OUT'));

-- Add keywords for SEO
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS keywords TEXT;

-- Add website_slug if not exists (for URL routing)
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS website_slug VARCHAR(180) UNIQUE;

-- Add website_last_synced_at if not exists
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS website_last_synced_at TIMESTAMP;

-- =========================================
-- Create indexes for performance
-- =========================================

-- Index for CMS filtering (published packages)
CREATE INDEX IF NOT EXISTS idx_packages_published 
ON packages(publish_to_website, is_deleted) 
WHERE publish_to_website = TRUE AND is_deleted = FALSE;

-- Index for package kind
CREATE INDEX IF NOT EXISTS idx_packages_kind 
ON packages(package_kind);

-- Index for package status
CREATE INDEX IF NOT EXISTS idx_packages_status 
ON packages(status);

-- Index for website slug lookups
CREATE INDEX IF NOT EXISTS idx_packages_website_slug 
ON packages(website_slug) 
WHERE website_slug IS NOT NULL;

-- =========================================
-- Verify Migration
-- =========================================

-- Check if all columns exist
DO $$
DECLARE
    missing_columns TEXT[];
    col TEXT;
BEGIN
    SELECT ARRAY_AGG(column_name)
    INTO missing_columns
    FROM (
        SELECT unnest(ARRAY[
            'base_cost', 'markup_percent', 'package_kind', 
            'custom_services', 'visa_details', 'payment_terms',
            'package_category', 'status', 'keywords',
            'website_slug', 'website_last_synced_at'
        ]) AS column_name
    ) expected
    WHERE NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'packages' 
        AND column_name = expected.column_name
    );

    IF missing_columns IS NOT NULL THEN
        RAISE NOTICE 'WARNING: Missing columns in packages table: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE 'SUCCESS: All required columns exist in packages table';
    END IF;
END $$;

-- =========================================
-- ROLLBACK (if needed)
-- =========================================
-- Uncomment to rollback changes (USE WITH CAUTION)
-- 
-- ALTER TABLE packages DROP COLUMN IF EXISTS base_cost;
-- ALTER TABLE packages DROP COLUMN IF EXISTS markup_percent;
-- ALTER TABLE packages DROP COLUMN IF EXISTS package_kind;
-- ALTER TABLE packages DROP COLUMN IF EXISTS custom_services;
-- ALTER TABLE packages DROP COLUMN IF EXISTS visa_details;
-- ALTER TABLE packages DROP COLUMN IF EXISTS payment_terms;
-- ALTER TABLE packages DROP COLUMN IF EXISTS package_category;
-- ALTER TABLE packages DROP COLUMN IF EXISTS status;
-- ALTER TABLE packages DROP COLUMN IF EXISTS keywords;
-- ALTER TABLE packages DROP COLUMN IF EXISTS website_slug;
-- ALTER TABLE packages DROP COLUMN IF EXISTS website_last_synced_at;
-- 
-- DROP INDEX IF EXISTS idx_packages_published;
-- DROP INDEX IF EXISTS idx_packages_kind;
-- DROP INDEX IF EXISTS idx_packages_status;
-- DROP INDEX IF EXISTS idx_packages_website_slug;
