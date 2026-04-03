BEGIN;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS lead_code VARCHAR(20);

CREATE SEQUENCE IF NOT EXISTS leads_lead_code_seq
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1;

CREATE OR REPLACE FUNCTION public.generate_lead_code_from_serial(serial_value BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  chars CONSTANT TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  n BIGINT := GREATEST(COALESCE(serial_value, 1), 1) - 1;
  l1 INT;
  d1 INT;
  l2 INT;
  d2 INT;
  l3 INT;
  d3 INT;
BEGIN
  d3 := (n % 10)::INT;
  n := n / 10;
  l3 := (n % 26)::INT;
  n := n / 26;
  d2 := (n % 10)::INT;
  n := n / 10;
  l2 := (n % 26)::INT;
  n := n / 26;
  d1 := (n % 10)::INT;
  n := n / 10;
  l1 := (n % 26)::INT;

  RETURN
    SUBSTRING(chars FROM l1 + 1 FOR 1) ||
    d1::TEXT ||
    SUBSTRING(chars FROM l2 + 1 FOR 1) ||
    d2::TEXT ||
    SUBSTRING(chars FROM l3 + 1 FOR 1) ||
    d3::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.lead_code_to_serial(code_value TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  chars CONSTANT TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  cleaned TEXT := UPPER(TRIM(COALESCE(code_value, '')));
  l1 INT;
  d1 INT;
  l2 INT;
  d2 INT;
  l3 INT;
  d3 INT;
BEGIN
  IF cleaned !~ '^[A-Z][0-9][A-Z][0-9][A-Z][0-9]$' THEN
    RETURN NULL;
  END IF;

  l1 := POSITION(SUBSTRING(cleaned FROM 1 FOR 1) IN chars) - 1;
  d1 := SUBSTRING(cleaned FROM 2 FOR 1)::INT;
  l2 := POSITION(SUBSTRING(cleaned FROM 3 FOR 1) IN chars) - 1;
  d2 := SUBSTRING(cleaned FROM 4 FOR 1)::INT;
  l3 := POSITION(SUBSTRING(cleaned FROM 5 FOR 1) IN chars) - 1;
  d3 := SUBSTRING(cleaned FROM 6 FOR 1)::INT;

  RETURN (((((l1 * 10 + d1) * 26 + l2) * 10 + d2) * 26 + l3) * 10 + d3) + 1;
END;
$$;

ALTER TABLE leads
  ALTER COLUMN lead_code SET DEFAULT public.generate_lead_code_from_serial(nextval('leads_lead_code_seq'));

DO $$
DECLARE
  max_serial BIGINT;
BEGIN
  SELECT COALESCE(MAX(public.lead_code_to_serial(lead_code)), 0)
  INTO max_serial
  FROM leads;

  IF max_serial > 0 THEN
    PERFORM setval('leads_lead_code_seq', max_serial, TRUE);
  ELSE
    PERFORM setval('leads_lead_code_seq', 1, FALSE);
  END IF;
END;
$$;

UPDATE leads
SET lead_code = public.generate_lead_code_from_serial(nextval('leads_lead_code_seq'))
WHERE lead_code IS NULL
   OR lead_code !~ '^[A-Z][0-9][A-Z][0-9][A-Z][0-9]$';

DO $$
DECLARE
  max_serial BIGINT;
BEGIN
  SELECT COALESCE(MAX(public.lead_code_to_serial(lead_code)), 0)
  INTO max_serial
  FROM leads;

  IF max_serial > 0 THEN
    PERFORM setval('leads_lead_code_seq', max_serial, TRUE);
  ELSE
    PERFORM setval('leads_lead_code_seq', 1, FALSE);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_leads_lead_code_format'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT chk_leads_lead_code_format
      CHECK (lead_code ~ '^[A-Z][0-9][A-Z][0-9][A-Z][0-9]$');
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_lead_code_unique
  ON leads(lead_code);

ALTER TABLE leads
  ALTER COLUMN lead_code SET NOT NULL;

COMMENT ON COLUMN leads.meta_lead_id IS
'Stores ad-platform identifier (Meta/Facebook lead id). Not used as CRM Lead ID';

COMMENT ON COLUMN leads.lead_code IS
'Primary CRM Lead ID in A1B2C3 format; auto-generated and unique for filtering/search';

COMMIT;
