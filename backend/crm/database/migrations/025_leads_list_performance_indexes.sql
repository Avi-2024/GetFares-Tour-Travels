CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_leads_active_created_at_desc
  ON leads(created_at DESC)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_leads_country_lower
  ON leads((LOWER(lead_country)));

CREATE INDEX IF NOT EXISTS idx_leads_full_name_trgm
  ON leads USING gin (LOWER(full_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_leads_email_trgm
  ON leads USING gin (LOWER(email) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_full_name_trgm
  ON customers USING gin (LOWER(full_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_email_trgm
  ON customers USING gin (LOWER(email) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_leads_phone_digits
  ON leads ((regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g')));

CREATE INDEX IF NOT EXISTS idx_customers_phone_digits
  ON customers ((regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g')));
