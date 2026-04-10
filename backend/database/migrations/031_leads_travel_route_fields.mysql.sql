START TRANSACTION;

ALTER TABLE leads
  ADD COLUMN travel_from VARCHAR(150),
  ADD COLUMN travel_to VARCHAR(150);

UPDATE leads l
JOIN destinations d ON l.destination_id = d.id
SET l.travel_to = d.name
WHERE l.travel_to IS NULL OR TRIM(l.travel_to) = '';

CREATE INDEX idx_leads_travel_to ON leads (travel_to);
CREATE INDEX idx_leads_travel_from ON leads (travel_from);

COMMIT;
