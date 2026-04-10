-- MySQL doesn't support pg_trgm extension, using FULLTEXT indexes instead

CREATE INDEX idx_leads_active_created_at_desc
  ON leads(created_at DESC, is_deleted);

CREATE INDEX idx_leads_country_lower
  ON leads(lead_country);

-- FULLTEXT indexes for text search (MySQL alternative to pg_trgm)
ALTER TABLE leads ADD FULLTEXT INDEX idx_leads_full_name_ft (full_name);
ALTER TABLE leads ADD FULLTEXT INDEX idx_leads_email_ft (email);

ALTER TABLE customers ADD FULLTEXT INDEX idx_customers_full_name_ft (full_name);
ALTER TABLE customers ADD FULLTEXT INDEX idx_customers_email_ft (email);

-- Phone number indexes (MySQL uses REGEXP_REPLACE differently)
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_customers_phone ON customers(phone);
