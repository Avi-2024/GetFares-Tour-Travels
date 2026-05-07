-- Dynamic lead fields (Meta forms and other sources)
-- Hybrid model: fixed columns + flexible JSON + optional key/value table.

ALTER TABLE leads
  ADD COLUMN platform VARCHAR(40) NULL,
  ADD COLUMN campaign_name VARCHAR(150) NULL,
  ADD COLUMN ad_name VARCHAR(150) NULL,
  ADD COLUMN city VARCHAR(150) NULL,
  ADD COLUMN dynamic_fields JSON NULL,
  ADD COLUMN dynamic_field_labels JSON NULL;

CREATE INDEX idx_leads_platform_created_at ON leads(platform, created_at);
CREATE INDEX idx_leads_campaign_name ON leads(campaign_name);
CREATE INDEX idx_leads_ad_name ON leads(ad_name);
CREATE INDEX idx_leads_city ON leads(city);

-- Optional: key/value representation for exports and analytics.
CREATE TABLE IF NOT EXISTS lead_dynamic_fields (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  lead_id CHAR(36) NOT NULL,
  field_key VARCHAR(120) NOT NULL,
  field_label VARCHAR(255) NULL,
  field_value TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lead_dynamic_fields_lead_key (lead_id, field_key),
  KEY idx_lead_dynamic_fields_key (field_key),
  KEY idx_lead_dynamic_fields_lead (lead_id),
  CONSTRAINT fk_lead_dynamic_fields_lead
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);





