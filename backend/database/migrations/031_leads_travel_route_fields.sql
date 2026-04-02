BEGIN;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS travel_from VARCHAR(150),
  ADD COLUMN IF NOT EXISTS travel_to VARCHAR(150);

UPDATE leads l
SET travel_to = d.name
FROM destinations d
WHERE l.destination_id = d.id
  AND (l.travel_to IS NULL OR BTRIM(l.travel_to) = '');

CREATE INDEX IF NOT EXISTS idx_leads_travel_to ON leads (travel_to);
CREATE INDEX IF NOT EXISTS idx_leads_travel_from ON leads (travel_from);

COMMENT ON COLUMN leads.travel_from IS
'Origin city/country selected in lead create flow';

COMMENT ON COLUMN leads.travel_to IS
'Destination city/country selected in lead create flow';

COMMIT;

