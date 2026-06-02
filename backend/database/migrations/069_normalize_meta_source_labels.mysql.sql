-- Keep Meta mapping source labels within supported CRM labels.
-- Old rows can bypass API validation, so normalize them in data too.

UPDATE meta_lead_profiles
SET source_label = 'Meta India Page'
WHERE source_label IN ('Meta India', 'Meta INDIA Page', 'India Page')
   OR (
    source_label = 'UAE Meta Page'
    AND (
      lead_country = 'India'
      OR client_currency = 'INR'
      OR scope_id = '1021995967663811'
    )
  );

UPDATE meta_lead_profiles
SET source_label = 'Meta UAE Page'
WHERE source_label IN ('Meta UAE', 'UAE Page')
   OR (
    source_label = 'UAE Meta Page'
    AND (
      lead_country IN ('UAE', 'United Arab Emirates')
      OR client_currency = 'AED'
      OR scope_id = '958886697315918'
    )
  );

UPDATE meta_lead_profiles
SET source_label = NULL
WHERE source_label IS NOT NULL
  AND source_label NOT IN ('Meta India Page', 'Meta UAE Page');
