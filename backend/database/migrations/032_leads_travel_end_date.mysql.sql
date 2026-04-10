START TRANSACTION;

ALTER TABLE leads
  ADD COLUMN travel_end_date DATE;

ALTER TABLE leads
  ADD CONSTRAINT chk_leads_travel_date_range
  CHECK (
    travel_end_date IS NULL
    OR travel_date IS NULL
    OR travel_end_date >= travel_date
  );

CREATE INDEX idx_leads_travel_end_date ON leads (travel_end_date);

COMMIT;
