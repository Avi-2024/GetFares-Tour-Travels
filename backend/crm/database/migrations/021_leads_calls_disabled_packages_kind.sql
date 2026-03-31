-- Lead call opt-out persistence (safe if column already exists)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS calls_disabled BOOLEAN DEFAULT FALSE;

-- Package operational kind: READY (static) vs CUSTOMIZED (editable services in CRM)
ALTER TABLE packages ADD COLUMN IF NOT EXISTS package_kind VARCHAR(20) DEFAULT 'READY';

-- Line items for customized packages (JSON array of { name, description?, cost, markupPercent?, sellValue? })
ALTER TABLE packages ADD COLUMN IF NOT EXISTS custom_services JSONB DEFAULT '[]'::jsonb;

-- Quotation SOP prefill (optional on package record)
ALTER TABLE packages ADD COLUMN IF NOT EXISTS visa_details TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS payment_terms TEXT;

CREATE INDEX IF NOT EXISTS idx_packages_kind ON packages(package_kind) WHERE is_deleted IS NOT TRUE;
