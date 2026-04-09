START TRANSACTION;

ALTER TABLE leads
  ADD COLUMN lead_code VARCHAR(20);

SET @rownum := 0;
UPDATE leads l
JOIN (
  SELECT id, (@rownum := @rownum + 1) AS rn
  FROM leads
  WHERE lead_code IS NULL OR lead_code NOT REGEXP '^[A-Z][0-9][A-Z][0-9][A-Z][0-9]$'
  ORDER BY created_at, id
) seq ON seq.id = l.id
SET l.lead_code = CONCAT(
  CHAR(65 + MOD(FLOOR((seq.rn - 1) / 6760), 26)),
  MOD(FLOOR((seq.rn - 1) / 676), 10),
  CHAR(65 + MOD(FLOOR((seq.rn - 1) / 260), 26)),
  MOD(FLOOR((seq.rn - 1) / 26), 10),
  CHAR(65 + MOD(FLOOR((seq.rn - 1) / 10), 26)),
  MOD((seq.rn - 1), 10)
);

ALTER TABLE leads
  ADD CONSTRAINT chk_leads_lead_code_format
  CHECK (lead_code REGEXP '^[A-Z][0-9][A-Z][0-9][A-Z][0-9]$');

CREATE UNIQUE INDEX idx_leads_lead_code_unique
  ON leads(lead_code);

ALTER TABLE leads
  MODIFY COLUMN lead_code VARCHAR(20) NOT NULL;

COMMIT;
