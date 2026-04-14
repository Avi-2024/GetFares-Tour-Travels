-- DATETIME keeps inserted digits; TIMESTAMP would apply server/UTC conversion.
ALTER TABLE followups
  MODIFY COLUMN followup_date DATETIME NULL;
