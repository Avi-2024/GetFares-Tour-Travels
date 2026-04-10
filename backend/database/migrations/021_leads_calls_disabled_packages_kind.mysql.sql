-- Lead call opt-out persistence (MySQL)
ALTER TABLE leads ADD COLUMN calls_disabled BOOLEAN DEFAULT FALSE;

-- Package operational kind: READY (static) vs CUSTOMIZED (editable services in CRM)
ALTER TABLE packages ADD COLUMN package_kind VARCHAR(20) DEFAULT 'READY';

-- Line items for customized packages (JSON array of { name, description?, cost, markupPercent?, sellValue? })
ALTER TABLE packages ADD COLUMN custom_services JSON DEFAULT (JSON_ARRAY());

-- Quotation SOP prefill (optional on package record)
ALTER TABLE packages ADD COLUMN visa_details TEXT;
ALTER TABLE packages ADD COLUMN payment_terms TEXT;

CREATE INDEX idx_packages_kind ON packages(package_kind, is_deleted);
