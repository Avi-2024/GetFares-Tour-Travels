ALTER TABLE campaigns
  ADD COLUMN country VARCHAR(100) DEFAULT NULL AFTER name;

CREATE INDEX idx_campaigns_country ON campaigns(country);


SELECT id, meta_lead_id, meta_campaign_id, meta_page_id, lead_country, created_at
FROM leads
WHERE meta_lead_id = '910400815152791';


SELECT id, name, country, meta_campaign_id, created_at
FROM campaigns
WHERE meta_campaign_id IS NOT NULL
ORDER BY created_at DESC;

INSERT INTO campaigns (
  id,
 
  country,
  source,
  budget,
  actual_spend,
  leads_generated,
  revenue_generated,
  meta_campaign_id
) VALUES (
  UUID(),
  'India Meta Campaign 520110',

  'META',
  0,
  0,
  0,
  0,
  '120247520245520110'
);

