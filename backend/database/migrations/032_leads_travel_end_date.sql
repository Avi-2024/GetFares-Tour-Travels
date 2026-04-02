BEGIN;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS travel_end_date DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_leads_travel_date_range'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT chk_leads_travel_date_range
      CHECK (
        travel_end_date IS NULL
        OR travel_date IS NULL
        OR travel_end_date >= travel_date
      );
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_leads_travel_end_date ON leads (travel_end_date);

COMMENT ON COLUMN leads.travel_end_date IS
'Customer return/end date captured from create lead form';

COMMIT;

