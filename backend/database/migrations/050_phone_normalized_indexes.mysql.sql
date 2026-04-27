ALTER TABLE leads
ADD COLUMN phone_normalized VARCHAR(20) NULL;

ALTER TABLE customers
ADD COLUMN phone_normalized VARCHAR(20) NULL;

UPDATE leads
SET phone_normalized = REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '')
WHERE phone_normalized IS NULL;

UPDATE customers
SET phone_normalized = REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '')
WHERE phone_normalized IS NULL;

CREATE INDEX idx_leads_phone_normalized ON leads(phone_normalized);
CREATE INDEX idx_customers_phone_normalized ON customers(phone_normalized);
